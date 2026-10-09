import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../core/http/api-error';
import { Plan, PlanSesion, Recomendacion } from '../../models';
import { PlanService } from '../../services/plan.service';
import { RecomendacionService } from '../../services/recomendacion.service';

export interface CerrarSesionDatos {
  plan: Plan;
  sesion: PlanSesion;
}

const MAXIMO_OBSERVACION = 300;

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
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Cerrar la sesión {{ datos.sesion.numero }}</h2>
    <mat-dialog-content>
      <p class="dc-resumen">
        <mat-icon aria-hidden="true">assignment</mat-icon>
        <span>
          <strong>{{ datos.plan.tratamiento.nombre }}</strong> ·
          {{ datos.plan.paciente.nombre }}
          @if (datos.sesion.cita; as cita) {
            <br />
            Atendida el {{ cita.inicio | date: 'd MMM y' }} · {{ cita.codigo }}
          }
        </span>
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

      <p class="dc-aviso">
        <mat-icon aria-hidden="true">info</mat-icon>
        <span>
          La observación son cuidados posteriores, no una indicación clínica: no se usa para
          diagnóstico ni para recetar.
        </span>
      </p>

      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" [disabled]="enviando()" (click)="cerrar()">Volver</button>
      <button
        mat-flat-button
        type="button"
        [disabled]="!sePuedeEnviar() || enviando()"
        (click)="guardar()"
      >
        Cerrar la sesión
      </button>
    </mat-dialog-actions>
  `,
  styles: `
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
      font: var(--text-label);
      padding: 0;
      margin-bottom: var(--space-2);
    }
    .campo {
      width: 100%;
    }
    .ayuda {
      margin: var(--space-1) 0 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .error {
      color: var(--danger-ink);
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
  protected readonly hoy = new Date();

  protected readonly catalogo = signal<Recomendacion[]>([]);
  protected readonly cargandoCatalogo = signal(true);
  protected readonly elegidas = signal<string[]>([]);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected proximoControl: Date | null = null;
  protected observacion = '';

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
        ...(observacion ? { observacion } : {}),
      })
      .subscribe({
        next: (plan) => {
          this.enviando.set(false);
          this.dialogRef.close(plan);
        },
        error: (err: unknown) => {
          this.error.set(mensajeDeError(err));
          this.enviando.set(false);
        },
      });
  }
}

function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
