import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { CitaResumen } from '../../models';
import { CitaService } from '../../services/cita.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { iconoDeEstadoCita, tonoDeEstadoCita } from '../../shared/estado-cita';
import { etiquetaEstado, repartirCitas } from './repartir-citas';

@Component({
  selector: 'app-historial-citas',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="cabecera">
      <div>
        <h1>Historial de citas</h1>
        <p class="lead">Tus citas anteriores, con cómo terminó cada una.</p>
      </div>
      <a mat-stroked-button routerLink="/mis-citas">
        <mat-icon aria-hidden="true">event_note</mat-icon>
        Ver mis próximas citas
      </a>
    </div>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando el historial de citas" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (!cargando() && !error() && pasadas().length === 0) {
      <p class="vacio">Todavía no tienes citas anteriores.</p>
    }

    @if (pasadas().length > 0) {
      <ul class="citas">
        @for (cita of pasadas(); track cita.id) {
          <li class="cita">
            <div class="fecha" aria-hidden="true">
              <b>{{ dia(cita.fecha) }}</b>
              <span>{{ mes(cita.fecha) }}</span>
            </div>
            <div class="datos">
              <p class="que">{{ cita.tratamiento.nombre }}</p>
              <p class="cuando">
                {{ cita.fecha | date: "EEEE d 'de' MMMM 'de' y" }} ·
                <span class="hora">{{ cita.hora.slice(0, 5) }}</span>
              </p>
              <p class="quien">{{ cita.odontologo.nombre }}</p>
              <p class="codigo">{{ cita.codigo }}</p>
              @if (cita.motivoCancelacion) {
                <p class="motivo">Motivo: {{ cita.motivoCancelacion }}</p>
              }
            </div>
            <span
              class="dc-estado estado"
              [class.dc-estado--info]="tono(cita.estado) === 'info'"
              [class.dc-estado--ok]="tono(cita.estado) === 'ok'"
              [class.dc-estado--aviso]="tono(cita.estado) === 'aviso'"
              [class.dc-estado--error]="tono(cita.estado) === 'error'"
            >
              <mat-icon aria-hidden="true">{{ icono(cita.estado) }}</mat-icon>
              {{ etiquetaEstado(cita.estado) }}
            </span>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    h1 {
      font: var(--text-display-sm);
      letter-spacing: -0.01em;
      margin: 0;
    }
    .lead {
      margin: var(--space-2) 0 0;
      color: var(--ink-muted);
    }
    .citas {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-3);
    }
    .cita {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: var(--space-5);
      align-items: center;
      padding: var(--space-5);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .fecha {
      width: 4rem;
      padding: var(--space-2) 0;
      text-align: center;
      border-radius: var(--radius-md);
      background: var(--surface-sunken);
    }
    .fecha b {
      display: block;
      font: 700 1.5rem/1 var(--font-display);
    }
    .fecha span {
      font: var(--text-overline);
      letter-spacing: 0.08em;
      color: var(--ink-muted);
      text-transform: uppercase;
    }
    .datos p {
      margin: 0;
    }
    .que {
      font: var(--text-title-sm);
    }
    .cuando::first-letter {
      text-transform: uppercase;
    }
    .cuando,
    .quien {
      font: var(--text-body-sm);
      color: var(--ink-muted);
      margin-top: 2px;
    }
    .hora,
    .codigo {
      font: var(--text-code);
    }
    .codigo {
      color: var(--ink-muted);
      margin-top: 2px;
    }
    .motivo {
      margin-top: var(--space-2);
      font: var(--text-body-sm);
    }
    .error {
      color: var(--danger-ink);
    }
    .vacio {
      padding: var(--space-6) 0;
      color: var(--ink-muted);
    }
    @media (max-width: 40rem) {
      .cita {
        grid-template-columns: auto minmax(0, 1fr);
        padding: var(--space-4);
        gap: var(--space-4);
      }
      .cita .estado {
        grid-column: 1 / -1;
        justify-self: start;
      }
    }
  `,
})
export class HistorialCitas {
  private readonly servicio = inject(CitaService);

  protected readonly citas = signal<CitaResumen[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly pasadas = computed(() => repartirCitas(this.citas()).pasadas);
  protected readonly etiquetaEstado = etiquetaEstado;
  protected readonly tono = tonoDeEstadoCita;
  protected readonly icono = iconoDeEstadoCita;

  protected dia(fecha: string): string {
    return fecha.slice(8, 10);
  }

  protected mes(fecha: string): string {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
    return `${meses[Number(fecha.slice(5, 7)) - 1] ?? ''} ${fecha.slice(0, 4)}`;
  }

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    cargarTodasLasPaginas((pagina) => this.servicio.mias({}, { page: pagina, size: 100 })).subscribe(
      {
        next: (citas) => {
          this.citas.set(citas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.citas.set([]);
          this.error.set(mensajeDeError(err));
          this.cargando.set(false);
        },
      },
    );
  }
}
