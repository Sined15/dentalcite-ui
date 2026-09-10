import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { mensajeDeError } from '../../core/http/api-error';
import { CitaResumen, ResultadoCita } from '../../models';
import { CitaService } from '../../services/cita.service';

export interface ResultadoDialogoDatos {
  cita: CitaResumen;
}

/**
 * Registro del resultado de una cita (HU-16 · RF-22).
 *
 * <p>No reutiliza `ConfirmarDialogo`: aqui no se confirma una accion, se elige
 * entre dos, y ninguna es la «peligrosa» ni la «segura». Tampoco viene una
 * preseleccionada: que el paciente viniera o no es un hecho que hay que
 * consignar, y dejar «Atendida» marcada de antemano convertiria el descuido en
 * el resultado por defecto.
 *
 * <p>Avisa de que no tiene vuelta atras porque RN-09 es una maquina sin retorno:
 * un resultado mal registrado no se corrige, se queda.
 */
@Component({
  selector: 'app-resultado-dialogo',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>Registrar el resultado</h2>
    <mat-dialog-content>
      <p class="resumen">
        <strong>{{ datos.cita.codigo }}</strong> · {{ datos.cita.paciente.nombre }}<br />
        {{ datos.cita.fecha }} a las {{ datos.cita.hora.slice(0, 5) }} ·
        {{ datos.cita.tratamiento.nombre }}
      </p>

      <fieldset>
        <legend>¿Vino el paciente?</legend>
        <mat-radio-group [(ngModel)]="resultado" name="resultado">
          <mat-radio-button value="ATENDIDA">Sí, se le atendió</mat-radio-button>
          <mat-radio-button value="NO_ASISTIO">No se presentó</mat-radio-button>
        </mat-radio-group>
      </fieldset>

      <p class="aviso">Queda registrado junto a quién lo consigna y cuándo. No se puede deshacer.</p>

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
        [disabled]="!resultado || enviando()"
        (click)="registrar()"
      >
        Registrar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .resumen {
      margin: 0 0 1rem;
      line-height: 1.5;
    }
    fieldset {
      border: none;
      padding: 0;
      margin: 0;
    }
    legend {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
      margin-bottom: 0.5rem;
    }
    mat-radio-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    /* Color propio en vez de opacidad: al 75 % el contraste caia por debajo del
       4.5:1 que exige RNF-08. */
    .aviso {
      margin: 1rem 0 0;
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
export class ResultadoDialogo {
  private readonly servicio = inject(CitaService);
  private readonly dialogRef = inject(MatDialogRef<ResultadoDialogo>);
  protected readonly datos = inject<ResultadoDialogoDatos>(MAT_DIALOG_DATA);

  /** Sin valor inicial: elegirlo es la decisión, no una confirmación. */
  protected resultado: ResultadoCita | '' = '';
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected cerrar(): void {
    this.dialogRef.close(false);
  }

  protected registrar(): void {
    if (!this.resultado || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    this.servicio.registrarResultado(this.datos.cita.id, this.resultado).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err: unknown) => {
        // El 409 —ya tiene resultado, o todavia no ha terminado— se muestra aqui
        // y no cierra el dialogo: quien opera necesita leer por que no se pudo, y
        // la lista de detras se recarga igual al cerrar.
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
