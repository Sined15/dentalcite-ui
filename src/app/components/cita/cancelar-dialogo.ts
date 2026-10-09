import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../core/http/api-error';
import { CitaResumen } from '../../models';
import { CitaService } from '../../services/cita.service';

export interface CancelarDialogoDatos {
  cita: CitaResumen;
  mostrarPaciente?: boolean;
}

@Component({
  selector: 'app-cancelar-dialogo',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Cancelar la cita</h2>
    <mat-dialog-content>
      <p class="dc-resumen">
        <mat-icon aria-hidden="true">event</mat-icon>
        <span>
          <strong class="codigo">{{ datos.cita.codigo }}</strong>
          @if (datos.mostrarPaciente) {
            · {{ datos.cita.paciente.nombre }}
          }
          <br />
          {{ datos.cita.fecha }} a las {{ datos.cita.hora.slice(0, 5) }} ·
          {{ datos.cita.odontologo.nombre }}
        </span>
      </p>

      <mat-form-field appearance="outline" class="motivo">
        <mat-label>Motivo de la cancelación</mat-label>
        <textarea
          matInput
          rows="3"
          maxlength="255"
          required
          [(ngModel)]="motivo"
          name="motivo"
          [disabled]="enviando()"
        ></textarea>
        <mat-hint>Queda registrado junto a quién cancela y cuándo.</mat-hint>
      </mat-form-field>

      <p class="dc-aviso dc-aviso--advertencia">
        <mat-icon aria-hidden="true">warning</mat-icon>
        <span>
          La cita pasará a CANCELADA y su franja volverá a ofrecerse. No se puede deshacer.
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
        color="warn"
        type="button"
        [disabled]="!motivo.trim() || enviando()"
        (click)="cancelarCita()"
      >
        Cancelar la cita
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .codigo {
      font: var(--text-code);
    }
    .motivo {
      width: 100%;
    }
    .error {
      color: var(--danger-ink);
    }
  `,
})
export class CancelarDialogo {
  private readonly servicio = inject(CitaService);
  private readonly dialogRef = inject(MatDialogRef<CancelarDialogo>);
  protected readonly datos = inject<CancelarDialogoDatos>(MAT_DIALOG_DATA);

  protected motivo = '';
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected cerrar(): void {
    this.dialogRef.close(false);
  }

  protected cancelarCita(): void {
    const motivo = this.motivo.trim();
    if (!motivo) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    this.servicio.cancelar(this.datos.cita.id, motivo).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
