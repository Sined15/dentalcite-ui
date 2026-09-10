import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../core/http/api-error';
import { CitaResumen } from '../../models';
import { CitaService } from '../../services/cita.service';

export interface CancelarDialogoDatos {
  cita: CitaResumen;
}

/**
 * Cancelacion de una cita desde recepcion (HU-11 · RF-20).
 *
 * No reutiliza `ConfirmarDialogo`: aqui no basta con decir que si, hay que decir
 * **por que**. El motivo es obligatorio (RF-21 lo guarda en la bitacora), y el
 * boton no se habilita sin el, de modo que el 400 del servidor sea la red y no el
 * camino normal.
 *
 * Avisa de que la cancelacion no tiene vuelta atras porque RN-09 es una maquina
 * sin retorno: no existe «descancelar», solo volver a reservar.
 */
@Component({
  selector: 'app-cancelar-dialogo',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Cancelar la cita</h2>
    <mat-dialog-content>
      <p class="resumen">
        <strong>{{ datos.cita.codigo }}</strong> ·
        {{ datos.cita.paciente.nombre }}<br />
        {{ datos.cita.fecha }} a las {{ datos.cita.hora.slice(0, 5) }} ·
        {{ datos.cita.odontologo.nombre }}
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

      <p class="aviso">
        La cita pasará a CANCELADA y su franja volverá a ofrecerse. No se puede deshacer.
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
    .resumen {
      margin: 0 0 1rem;
      line-height: 1.5;
    }
    .motivo {
      width: 100%;
    }
    .aviso {
      margin: 0.5rem 0 0;
      opacity: 0.75;
      font-size: 0.875rem;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
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
        // El 409 —la cita ya no esta CONFIRMADA— se muestra aqui y no cierra el
        // dialogo: quien opera necesita leer por que no se pudo, y la lista de
        // detras se recarga igual al cerrar.
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
