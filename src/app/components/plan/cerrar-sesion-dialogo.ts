import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../core/http/api-error';
import { Plan, PlanSesion, Recomendacion } from '../../models';
import { PlanService } from '../../services/plan.service';
import { RecomendacionService } from '../../services/recomendacion.service';

export interface CerrarSesionDatos {
  plan: Plan;
  sesion: PlanSesion;
}

/** Lo que admite la observación, que es también lo que exige el servidor. */
const MAXIMO_OBSERVACION = 300;

/**
 * Cierre de una sesión con sus recomendaciones.
 *
 * <p>Las recomendaciones se eligen, no se escriben: el catálogo es cerrado, así que
 * son casillas y no un campo de texto. Lo que el odontólogo quiera añadir con sus
 * palabras va en la observación, y junto a ella está escrito que son cuidados y no
 * una indicación clínica —la frontera que el alcance del proyecto no cruza—.
 *
 * <p>El botón no se habilita sin al menos una recomendación y sin fecha, para que el
 * 400 del servidor sea la red y no el camino normal; es la misma decisión que toma
 * `SuspenderPlanDialogo` con el motivo.
 */
@Component({
  selector: 'app-cerrar-sesion-dialogo',
  providers: [provideNativeDateAdapter()],
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Cerrar la sesión {{ datos.sesion.numero }}</h2>
    <mat-dialog-content>
      <p class="resumen">
        <strong>{{ datos.plan.tratamiento.nombre }}</strong> ·
        {{ datos.plan.paciente.nombre }}
        @if (datos.sesion.cita; as cita) {
          <br />
          Atendida el {{ cita.inicio | date: 'd MMM y' }} · {{ cita.codigo }}
        }
      </p>

      <fieldset class="cuidados">
        <legend>Recomendaciones</legend>
        @if (cargandoCatalogo()) {
          <p class="ayuda">Cargando el catálogo…</p>
        }
        @for (cuidado of catalogo(); track cuidado.id) {
          <mat-checkbox
            [checked]="estaElegida(cuidado)"
            [disabled]="enviando()"
            (change)="alternar(cuidado)"
          >
            {{ cuidado.descripcion }}
          </mat-checkbox>
        }
        <p class="ayuda">Elige al menos una: es lo que el paciente leerá como indicación.</p>
      </fieldset>

      <mat-form-field appearance="outline" class="campo">
        <mat-label>Próximo control</mat-label>
        <input
          matInput
          [matDatepicker]="calendario"
          [min]="hoy"
          [(ngModel)]="proximoControl"
          name="proximoControl"
          [disabled]="enviando()"
        />
        <mat-datepicker-toggle matIconSuffix [for]="calendario" />
        <mat-datepicker #calendario />
        <mat-hint>Cuándo se le sugiere volver. No puede ser una fecha pasada.</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="campo">
        <mat-label>Observación de cuidado (opcional)</mat-label>
        <textarea
          matInput
          rows="3"
          [maxlength]="maximo"
          [(ngModel)]="observacion"
          name="observacion"
          [disabled]="enviando()"
        ></textarea>
        <mat-hint align="end">{{ observacion.length }} / {{ maximo }}</mat-hint>
      </mat-form-field>

      <p class="aviso">
        La observación son cuidados posteriores, no una indicación clínica: no se usa para
        diagnóstico ni para recetar.
      </p>

      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" [disabled]="enviando()" (click)="cerrar()">Volver</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="!sePuedeEnviar() || enviando()"
        (click)="guardar()"
      >
        Cerrar la sesión
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .resumen {
      margin: 0 0 1rem;
      line-height: 1.5;
    }
    .cuidados {
      border: 0;
      margin: 0 0 0.75rem;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: min(24rem, 70vw);
    }
    legend {
      font-weight: 600;
      padding: 0;
      margin-bottom: 0.25rem;
    }
    .campo {
      width: 100%;
    }
    /* Color propio en vez de opacidad: al 75 % el contraste caía por debajo del
       4.5:1 que exige la accesibilidad del proyecto. */
    .ayuda,
    .aviso {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      font-size: 0.875rem;
      margin: 0.75rem 0 0;
    }
  `,
})
export class CerrarSesionDialogo {
  private readonly servicio = inject(PlanService);
  private readonly recomendaciones = inject(RecomendacionService);
  private readonly dialogRef = inject<MatDialogRef<CerrarSesionDialogo, Plan | null>>(MatDialogRef);
  protected readonly datos = inject<CerrarSesionDatos>(MAT_DIALOG_DATA);

  protected readonly maximo = MAXIMO_OBSERVACION;
  /** El calendario no deja elegir ayer, que es lo que el servidor rechaza con un 400. */
  protected readonly hoy = new Date();

  protected readonly catalogo = signal<Recomendacion[]>([]);
  protected readonly cargandoCatalogo = signal(true);
  protected readonly elegidas = signal<string[]>([]);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected proximoControl: Date | null = null;
  protected observacion = '';

  /**
   * Un método y no un `computed`: la fecha llega por `ngModel` a una propiedad
   * normal, que no avisa al cambiar, así que un `computed` se quedaría con el
   * veredicto que dio antes de elegirla y el botón no se habilitaría nunca.
   */
  protected sePuedeEnviar(): boolean {
    return this.elegidas().length > 0 && this.proximoControl !== null;
  }

  constructor() {
    this.recomendaciones.listar().subscribe({
      next: (catalogo) => {
        this.catalogo.set(catalogo);
        this.cargandoCatalogo.set(false);
      },
      error: (err: unknown) => {
        this.cargandoCatalogo.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected estaElegida(cuidado: Recomendacion): boolean {
    return this.elegidas().includes(cuidado.id);
  }

  protected alternar(cuidado: Recomendacion): void {
    this.elegidas.update((elegidas) =>
      elegidas.includes(cuidado.id)
        ? elegidas.filter((id) => id !== cuidado.id)
        : [...elegidas, cuidado.id],
    );
  }

  protected cerrar(): void {
    this.dialogRef.close(null);
  }

  protected guardar(): void {
    if (!this.sePuedeEnviar() || this.enviando() || !this.proximoControl) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    const observacion = this.observacion.trim();
    this.servicio
      .cerrarSesion(this.datos.plan.id, this.datos.sesion.numero, {
        recomendacionIds: this.elegidas(),
        proximoControl: aIso(this.proximoControl),
        // Ausente y no vacía: una observación en blanco es no haber escrito ninguna.
        ...(observacion ? { observacion } : {}),
      })
      .subscribe({
        next: (plan) => {
          this.enviando.set(false);
          this.dialogRef.close(plan);
        },
        error: (err: unknown) => {
          // El 409 —la sesión no tiene cita atendida o ya estaba cerrada— y el 403
          // se muestran aquí sin cerrar el diálogo: quien opera necesita leer por
          // qué no se pudo.
          this.error.set(mensajeDeError(err));
          this.enviando.set(false);
        },
      });
  }
}

/**
 * La fecha en "YYYY-MM-DD" local, que es como la espera el servidor.
 *
 * No sirve `toISOString()`: pasa por UTC, y en Lima una fecha a medianoche
 * retrocederia al dia anterior.
 */
function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
