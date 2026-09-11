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
import { etiquetaEstado, repartirCitas } from './repartir-citas';

/**
 * Las citas que ya pasaron, del propio paciente.
 *
 * <p>Era una sección de «Mis citas» y ahora es pantalla: ahí el botón de cancelar
 * es lo que importa, y una lista con lo de años atrás lo enterraba. Aquí no hay
 * ninguna acción —sobre lo que ya ocurrió no se puede hacer nada— y por eso no
 * aparece el diálogo de cancelación por ningún lado.
 *
 * <p><strong>Se piden todas las páginas</strong>, no las primeras cien como en
 * «Mis citas». Allí el techo lo pone RN-07, que limita las citas activas; un
 * historial no tiene techo, y uno que se corta sin decirlo está mintiendo sobre
 * lo que le hicieron al paciente.
 *
 * <p>No hay bitácora: `GET /api/v1/citas/{id}/historial` es de recepción y
 * administración, y el paciente recibe 403. Lo que se puede contar de una cita
 * pasada es su estado y, si la cancelaron, el motivo.
 */
@Component({
  selector: 'app-historial-citas',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="cabecera">
      <h1>Historial de citas</h1>
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
          <li>
            <mat-card class="cita">
              <mat-card-content>
                <div class="datos">
                  <p class="cuando">
                    {{ cita.fecha | date: "d 'de' MMMM 'de' y" }} ·
                    {{ cita.hora.slice(0, 5) }}
                  </p>
                  <p class="que">{{ cita.tratamiento.nombre }}</p>
                  <p class="quien">{{ cita.odontologo.nombre }}</p>
                  <p class="codigo">
                    {{ cita.codigo }} ·
                    <span class="estado">{{ etiquetaEstado(cita.estado) }}</span>
                  </p>
                  @if (cita.motivoCancelacion) {
                    <p class="motivo">Motivo: {{ cita.motivoCancelacion }}</p>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .cabecera {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
    }
    .citas {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.75rem;
    }
    .datos p {
      margin: 0 0 0.25rem;
    }
    /* es-PE escribe el dia de la semana en minuscula; capitalizar la frase
       entera daria «Lunes 14 De Septiembre». */
    .cuando::first-letter {
      text-transform: uppercase;
    }
    .que,
    .quien {
      font-size: 0.9375rem;
    }
    /* Color propio en vez de opacidad: al 70 % el contraste caia por debajo del
       4.5:1 que exige RNF-08. */
    .codigo,
    .motivo {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
    }
    .estado {
      font-weight: 500;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
    .vacio {
      padding: 1.5rem 0;
      color: var(--mat-sys-on-surface-variant, #45464f);
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

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    // Sin filtro de estado: el historial son todas las que ya pasaron, incluidas
    // las canceladas y aquellas a las que no se asistió. Filtrar por ATENDIDA
    // aquí sería la pantalla de tratamientos, que es otra.
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
