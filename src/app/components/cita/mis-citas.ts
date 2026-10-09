import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { CitaResumen } from '../../models';
import { CitaService } from '../../services/cita.service';
import { CancelarDialogo, CancelarDialogoDatos } from './cancelar-dialogo';
import { etiquetaEstado, repartirCitas } from './repartir-citas';

@Component({
  selector: 'app-mis-citas',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="cabecera">
      <h1>Mis citas</h1>
      <a mat-flat-button routerLink="/disponibilidad">
        <mat-icon>event_available</mat-icon>
        Reservar una cita
      </a>
    </div>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando mis citas" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (!cargando() && citas().length === 0 && !error()) {
      <p class="vacio">Todavía no tienes ninguna cita.</p>
    }

    @if (futuras().length > 0) {
      <section>
        <h2>Próximas</h2>
        <ul class="citas">
          @for (cita of futuras(); track cita.id) {
            <li>
              <mat-card class="cita" appearance="outlined">
                <mat-card-content>
                  <div class="fecha" aria-hidden="true">
                    <span class="dia-num">{{ cita.fecha | date: 'd' }}</span>
                    <span class="mes">{{ cita.fecha | date: 'MMM' }}</span>
                  </div>
                  <div class="datos">
                    <p class="cuando">
                      {{ cita.fecha | date: "EEEE d 'de' MMMM" }} ·
                      <strong class="hora">{{ cita.hora.slice(0, 5) }}</strong>
                    </p>
                    <p class="que">
                      {{ cita.tratamiento.nombre }} · {{ cita.duracionMinutos }} min
                    </p>
                    <p class="quien">
                      {{ cita.odontologo.nombre }} · {{ cita.consultorio.nombre }}
                    </p>
                    <p class="codigo">
                      {{ cita.codigo }} ·
                      <span class="dc-estado dc-estado--info">
                        <mat-icon aria-hidden="true">schedule</mat-icon>
                        {{ etiquetaEstado(cita.estado) }}
                      </span>
                    </p>
                  </div>

                  <div class="acciones">
                    @if (cita.cancelablePorPaciente) {
                      <button
                        mat-stroked-button
                        class="cancelar"
                        type="button"
                        (click)="cancelar(cita)"
                        [attr.aria-label]="'Cancelar la cita ' + cita.codigo"
                      >
                        Cancelar
                      </button>
                    } @else if (cita.estado === 'CONFIRMADA') {
                      <p class="fuera-de-plazo">
                        <mat-icon aria-hidden="true">warning</mat-icon>
                        Ya no puedes cancelarla por aquí. Llama a la recepción de la clínica.
                      </p>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            </li>
          }
        </ul>
      </section>
    }

    @if (!cargando() && futuras().length === 0 && citas().length > 0) {
      <p class="vacio">
        No tienes ninguna cita próxima.
        <a routerLink="/mis-citas/historial">Consulta tu historial</a> para ver las anteriores.
      </p>
    }
  `,
  styles: `
    h2 {
      font: var(--text-title-lg);
      margin: var(--space-6) 0 var(--space-4);
    }
    .citas {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .cita mat-card-content {
      display: grid;
      grid-template-columns: 4.5rem minmax(0, 1fr) auto;
      gap: var(--space-5);
      align-items: center;
      padding: var(--space-5);
    }
    .fecha {
      background: var(--brand-soft);
      color: var(--on-brand-soft);
      border-radius: var(--radius-md);
      text-align: center;
      padding: var(--space-2) 0;
      display: flex;
      flex-direction: column;
    }
    .dia-num {
      font: 700 1.625rem/1 var(--font-display);
    }
    .mes {
      font: var(--text-overline);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .hora {
      font: var(--text-time);
      font-variant-numeric: tabular-nums;
    }
    .cancelar {
      --mat-button-outlined-label-text-color: var(--danger-ink);
    }
    .datos {
      min-width: 0;
    }
    .datos p {
      margin: 0 0 0.125rem;
    }
    .cuando::first-letter {
      text-transform: uppercase;
    }
    .que,
    .quien {
      font-size: 0.9375rem;
    }
    .codigo,
    .fuera-de-plazo {
      font-size: 0.8125rem;
      color: var(--ink-muted);
    }
    .acciones {
      display: flex;
      align-items: center;
    }
    .fuera-de-plazo {
      display: flex;
      gap: var(--space-2);
      align-items: flex-start;
      margin: 0;
      max-width: 16rem;
      color: var(--warning-ink);
    }
    .fuera-de-plazo mat-icon {
      flex: none;
      width: 1.125rem;
      height: 1.125rem;
      font-size: 1.125rem;
    }
    .error {
      color: var(--danger-ink);
    }
    .vacio {
      padding: 1.5rem 0;
      color: var(--ink-muted);
    }

    @media (max-width: 45rem) {
      .cita mat-card-content {
        grid-template-columns: 3.5rem minmax(0, 1fr);
        padding: var(--space-4);
      }
      .acciones {
        grid-column: 1 / -1;
        align-items: stretch;
        flex-direction: column;
      }
      .acciones button {
        width: 100%;
        min-height: 2.75rem;
      }
      .fuera-de-plazo {
        max-width: none;
      }
    }
  `,
})
export class MisCitas {
  private readonly servicio = inject(CitaService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly citas = signal<CitaResumen[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly futuras = computed(() => repartirCitas(this.citas()).futuras);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.servicio.mias({}, { size: 100 }).subscribe({
      next: (pagina) => {
        this.citas.set(pagina.content);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.citas.set([]);
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }

  protected cancelar(cita: CitaResumen): void {
    const datos: CancelarDialogoDatos = { cita, mostrarPaciente: false };
    this.dialogo
      .open(CancelarDialogo, { data: datos })
      .afterClosed()
      .subscribe((cancelada) => {
        if (!cancelada) {
          return;
        }
        this.snackBar.open(`Cita ${cita.codigo} cancelada.`, 'Cerrar', { duration: 6000 });
        this.cargar();
      });
  }

  protected readonly etiquetaEstado = etiquetaEstado;
}
