import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CitaAfectada } from '../../core/http/api.types';

@Component({
  selector: 'app-citas-afectadas-dialogo',
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>El bloqueo no se aplicó</h2>
    <mat-dialog-content>
      <p class="dc-aviso dc-aviso--advertencia">
        <mat-icon aria-hidden="true">warning</mat-icon>
        <span>{{ datos.mensaje }}</span>
      </p>
      <p class="explicacion">
        Hay citas confirmadas dentro del rango. Cancélalas con motivo antes de volver a
        registrar el bloqueo.
      </p>

      <ul class="citas" aria-label="Citas afectadas por el bloqueo">
        @for (cita of datos.citas; track cita.codigo) {
          <li>
            <div>
              <p class="paciente">{{ cita.paciente }}</p>
              <p class="historia">{{ cita.numeroHistoria }}</p>
            </div>
            <div class="cuando">
              <p>{{ cita.inicio | date: 'd MMM, HH:mm' }} – {{ cita.fin | date: 'HH:mm' }}</p>
              <p class="historia">{{ cita.codigo }}</p>
            </div>
          </li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `,
  styles: `
    .explicacion {
      margin: 0 0 var(--space-3);
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .citas {
      list-style: none;
      margin: 0;
      padding: 0 var(--space-4);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }
    .citas li {
      display: flex;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border);
    }
    .citas li:last-child {
      border-bottom: none;
    }
    .citas p {
      margin: 0;
    }
    .paciente {
      font-weight: 500;
    }
    .cuando {
      text-align: right;
      font: var(--text-code);
    }
    .historia {
      font: var(--text-code);
      color: var(--ink-muted);
    }
  `,
})
export class CitasAfectadasDialogo {
  protected readonly datos = inject<{ mensaje: string; citas: CitaAfectada[] }>(MAT_DIALOG_DATA);
}
