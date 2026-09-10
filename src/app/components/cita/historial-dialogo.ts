import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { mensajeDeError } from '../../core/http/api-error';
import { CitaHistorial, CitaResumen } from '../../models';
import { CitaService } from '../../services/cita.service';

export interface HistorialDialogoDatos {
  cita: CitaResumen;
}

/**
 * La bitacora de una cita (HU-11 · RF-21).
 *
 * Como RN-12 impide borrar nada, esta es la unica forma de saber que le paso a
 * una cita y por orden de quien. Se presenta como linea de tiempo y no como
 * tabla porque lo que importa es el orden, no comparar columnas.
 */
@Component({
  selector: 'app-historial-dialogo',
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title>Historial de {{ datos.cita.codigo }}</h2>
    <mat-dialog-content>
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando el historial" />
      }

      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }

      @if (!cargando() && !error()) {
        <ol class="linea">
          @for (paso of transiciones(); track paso.id) {
            <li>
              <p class="estado">
                @if (paso.estadoAnterior) {
                  {{ paso.estadoAnterior }} → {{ paso.estadoNuevo }}
                } @else {
                  Cita creada · {{ paso.estadoNuevo }}
                }
              </p>
              <p class="cuando">{{ paso.ocurridoEn | date: "d 'de' MMMM 'de' y, HH:mm" }}</p>
              @if (paso.responsable; as quien) {
                <p class="quien">{{ quien.nombre }} · {{ quien.rol }}</p>
              }
              @if (paso.motivo) {
                <p class="motivo">«{{ paso.motivo }}»</p>
              }
            </li>
          }
        </ol>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .linea {
      list-style: none;
      margin: 0;
      padding: 0 0 0 1rem;
      border-left: 2px solid var(--mat-sys-outline-variant, #cac4d0);
    }
    .linea li {
      padding: 0 0 1.25rem 1rem;
      position: relative;
    }
    .linea li::before {
      content: '';
      position: absolute;
      left: -1.4rem;
      top: 0.35rem;
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 50%;
      background: var(--mat-sys-primary, #6750a4);
    }
    .estado {
      margin: 0;
      font-weight: 600;
    }
    .cuando,
    .quien {
      margin: 0.15rem 0 0;
      font-size: 0.875rem;
      opacity: 0.75;
    }
    .motivo {
      margin: 0.35rem 0 0;
      font-style: italic;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class HistorialDialogo {
  private readonly servicio = inject(CitaService);
  protected readonly datos = inject<HistorialDialogoDatos>(MAT_DIALOG_DATA);

  protected readonly transiciones = signal<CitaHistorial[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.servicio.historial(this.datos.cita.id).subscribe({
      next: (lista) => {
        this.transiciones.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
