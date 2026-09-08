import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { CitaAfectada } from '../../core/http/api.types';

/**
 * El 409 de un bloqueo es el unico error del sistema con datos estructurados:
 * trae las citas CONFIRMADAS que el rango alcanzaria. HU-07 pide listarlas para
 * que se cancelen con motivo antes de reintentar (RN-03), asi que se muestran
 * como tabla y no como un snackbar.
 */
@Component({
  selector: 'app-citas-afectadas-dialogo',
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatTableModule],
  template: `
    <h2 mat-dialog-title>El bloqueo no se aplico</h2>
    <mat-dialog-content>
      <p>{{ datos.mensaje }}</p>
      <p class="explicacion">
        Hay citas confirmadas dentro del rango. Cancelalas con motivo antes de volver a
        registrar el bloqueo.
      </p>

      <div class="tabla-scroll" tabindex="0" role="region" aria-label="Tabla de citas afectadas por el bloqueo">
        <table mat-table [dataSource]="datos.citas">
          <ng-container matColumnDef="codigo">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let cita">{{ cita.codigo }}</td>
          </ng-container>

          <ng-container matColumnDef="paciente">
            <th mat-header-cell *matHeaderCellDef>Paciente</th>
            <td mat-cell *matCellDef="let cita">
              {{ cita.paciente }}
              <span class="historia">{{ cita.numeroHistoria }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="inicio">
            <th mat-header-cell *matHeaderCellDef>Inicio</th>
            <td mat-cell *matCellDef="let cita">{{ cita.inicio | date: 'short' }}</td>
          </ng-container>

          <ng-container matColumnDef="fin">
            <th mat-header-cell *matHeaderCellDef>Fin</th>
            <td mat-cell *matCellDef="let cita">{{ cita.fin | date: 'short' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
        </table>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `,
  styles: `
    .explicacion {
      font-size: 0.875rem;
      opacity: 0.8;
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 34rem;
    }
    .historia {
      display: block;
      font-size: 0.75rem;
      opacity: 0.7;
    }
  `,
})
export class CitasAfectadasDialogo {
  protected readonly datos = inject<{ mensaje: string; citas: CitaAfectada[] }>(MAT_DIALOG_DATA);
  protected readonly columnas = ['codigo', 'paciente', 'inicio', 'fin'];
}
