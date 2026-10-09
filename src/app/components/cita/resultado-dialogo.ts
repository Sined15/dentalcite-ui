import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { mensajeDeError } from '../../core/http/api-error';
import { Cita, CitaResumen, ResultadoCita } from '../../models';
import { CitaService } from '../../services/cita.service';

export interface ResultadoDialogoDatos {
  cita: CitaResumen;
}

export function avisoDeResultado(cerrada: Cita): string {
  const aviso = `Resultado de ${cerrada.codigo} registrado.`;
  const sesion = cerrada.sesionEnlazada;
  return sesion
    ? `${aviso} Ocupa la sesión ${sesion.numero} de su plan de ${sesion.tratamiento}.`
    : aviso;
}

@Component({
  selector: 'app-resultado-dialogo',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatIconModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>Registrar el resultado</h2>
    <mat-dialog-content>
      <p class="dc-resumen">
        <mat-icon aria-hidden="true">event</mat-icon>
        <span>
          <strong class="codigo">{{ datos.cita.codigo }}</strong> · {{ datos.cita.paciente.nombre }}<br />
          {{ datos.cita.fecha }} a las {{ datos.cita.hora.slice(0, 5) }} ·
          {{ datos.cita.tratamiento.nombre }}
        </span>
      </p>

      <fieldset>
        <legend>¿Vino el paciente?</legend>
        <mat-radio-group [(ngModel)]="resultado" name="resultado">
          <mat-radio-button value="ATENDIDA">Sí, se le atendió</mat-radio-button>
          <mat-radio-button value="NO_ASISTIO">No se presentó</mat-radio-button>
        </mat-radio-group>
      </fieldset>

      <p class="dc-aviso">
        <mat-icon aria-hidden="true">info</mat-icon>
        <span>Queda registrado junto a quién lo consigna y cuándo. No se puede deshacer.</span>
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
        [disabled]="!resultado || enviando()"
        (click)="registrar()"
      >
        Registrar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .codigo {
      font: var(--text-code);
    }
    fieldset {
      border: none;
      padding: 0;
      margin: 0;
    }
    legend {
      font: var(--text-label);
      margin-bottom: var(--space-2);
      padding: 0;
    }
    mat-radio-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    mat-radio-button {
      padding-right: var(--space-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: var(--surface);
    }
    mat-radio-button.mat-mdc-radio-checked {
      border-color: var(--brand);
      background: var(--brand-soft);
      color: var(--on-brand-soft);
    }
    .error {
      color: var(--danger-ink);
      font-size: 0.875rem;
      margin: 0.75rem 0 0;
    }
  `,
})
export class ResultadoDialogo {
  private readonly servicio = inject(CitaService);
  private readonly dialogRef = inject(MatDialogRef<ResultadoDialogo>);
  protected readonly datos = inject<ResultadoDialogoDatos>(MAT_DIALOG_DATA);

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
      next: (cerrada) => this.dialogRef.close(cerrada),
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
