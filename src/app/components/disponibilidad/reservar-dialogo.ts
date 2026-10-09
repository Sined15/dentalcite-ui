import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { mensajeDeError } from '../../core/http/api-error';
import { Cita } from '../../models';
import { CitaService } from '../../services/cita.service';
import { BloqueAgrupado } from './agrupar-franjas';

export interface ReservarResultado {
  cita?: Cita;
  recargar?: string;
}

export interface ReservarPara {
  id: string;
  nombre: string;
  numeroHistoria: string;
}

export interface ReservarDialogoDatos {
  tratamientoId: string;
  tratamientoNombre: string;
  duracionMinutos: number;
  fecha: string;
  bloque: BloqueAgrupado;
  paciente?: ReservarPara;
}

@Component({
  selector: 'app-reservar-dialogo',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatRadioModule,
  ],
  template: `
    <h2 mat-dialog-title>Reservar cita</h2>
    <mat-dialog-content>
      <p class="dc-resumen">
        <mat-icon aria-hidden="true">event</mat-icon>
        <span>
          <strong>{{ datos.tratamientoNombre }}</strong> · {{ datos.duracionMinutos }} min<br />
          {{ datos.fecha | date: "EEEE d 'de' MMMM" }}
        </span>
      </p>

      @if (datos.paciente; as paciente) {
        <p class="para">
          Para <strong>{{ paciente.nombre }}</strong>
          <span class="historia">Historia clínica {{ paciente.numeroHistoria }}</span>
        </p>
      }

      @if (odontologos.length > 1) {
        <fieldset>
          <legend>Odontólogo</legend>
          <mat-radio-group [(ngModel)]="odontologoElegido" (ngModelChange)="cambiarOdontologo()">
            @for (odo of odontologos; track odo.id) {
              <mat-radio-button [value]="odo.id">{{ odo.nombre }}</mat-radio-button>
            }
          </mat-radio-group>
        </fieldset>
      } @else {
        <p class="unico">
          Con <strong>{{ odontologos[0].nombre }}</strong>
        </p>
      }

      @if (horasDisponibles().length > 1) {
        <fieldset>
          <legend>Hora</legend>
          <mat-radio-group [(ngModel)]="horaElegida">
            @for (hora of horasDisponibles(); track hora) {
              <mat-radio-button [value]="hora">{{ hora }}</mat-radio-button>
            }
          </mat-radio-group>
        </fieldset>
      } @else {
        <p class="unico">
          A las <strong>{{ horasDisponibles()[0] }}</strong>
        </p>
      }

      <p class="dc-aviso">
        <mat-icon aria-hidden="true">info</mat-icon>
        <span>El consultorio se asigna automáticamente al confirmar.</span>
      </p>

      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(null)">Cancelar</button>
      <button
        mat-flat-button
        type="button"
        [disabled]="enviando()"
        (click)="confirmar()"
      >
        Confirmar reserva
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    fieldset {
      border: none;
      padding: 0;
      margin: 0 0 var(--space-4);
    }
    legend {
      font: var(--text-label);
      padding: 0;
      margin-bottom: var(--space-2);
    }
    mat-radio-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
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
    .horas mat-radio-group {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .unico {
      margin: 0 0 var(--space-3);
    }
    .para {
      margin: 0 0 var(--space-4);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      background: var(--brand-soft);
      color: var(--on-brand-soft);
      display: flex;
      flex-direction: column;
    }
    .historia {
      font: var(--text-code);
    }
    .error {
      color: var(--danger-ink);
      font-size: 0.875rem;
      margin: 0.75rem 0 0;
    }
  `,
})
export class ReservarDialogo {
  private readonly servicio = inject(CitaService);

  protected readonly dialogRef =
    inject<MatDialogRef<ReservarDialogo, ReservarResultado | null>>(MatDialogRef);
  protected readonly datos = inject<ReservarDialogoDatos>(MAT_DIALOG_DATA);

  protected readonly odontologos = this.datos.bloque.odontologos;
  protected odontologoElegido = this.odontologos[0].id;
  protected horaElegida = this.odontologos[0].inicios[0];

  private readonly odontologoActual = signal(this.odontologos[0].id);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly horasDisponibles = computed<string[]>(() => {
    const id = this.odontologoActual();
    return this.odontologos.find((o) => o.id === id)?.inicios ?? [];
  });

  protected cambiarOdontologo(): void {
    this.odontologoActual.set(this.odontologoElegido);
    const horas = this.horasDisponibles();
    if (!horas.includes(this.horaElegida)) {
      this.horaElegida = horas[0];
    }
  }

  protected confirmar(): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    const paciente = this.datos.paciente;
    this.servicio
      .reservar({
        tratamientoId: this.datos.tratamientoId,
        odontologoId: this.odontologoElegido,
        fecha: this.datos.fecha,
        hora: this.horaElegida,
        ...(paciente ? { pacienteId: paciente.id } : {}),
      })
      .subscribe({
        next: (cita) => {
          this.enviando.set(false);
          this.dialogRef.close({ cita });
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          const mensaje = mensajeDeError(err);

          if (err instanceof HttpErrorResponse && err.status === 409) {
            this.dialogRef.close({ recargar: mensaje });
            return;
          }

          this.error.set(mensaje);
        },
      });
  }
}
