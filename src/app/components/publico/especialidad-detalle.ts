import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { EspecialidadDetalle, OdontologoPublico } from '../../models';
import { PublicoService } from '../../services/publico.service';
import { visualDeEspecialidad } from '../../shared/especialidad-visual';

@Component({
  selector: 'app-especialidad-detalle',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando la especialidad" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
      <a mat-stroked-button routerLink="/nuestras-especialidades">Ver todas las especialidades</a>
    }

    @if (detalle(); as especialidad) {
      <div [attr.data-spec]="visual().clave">
        <nav class="migas" aria-label="Migas de pan">
          <a routerLink="/">Inicio</a>
          <mat-icon aria-hidden="true">chevron_right</mat-icon>
          <a routerLink="/nuestras-especialidades">Especialidades</a>
          <mat-icon aria-hidden="true">chevron_right</mat-icon>
          <span aria-current="page">{{ especialidad.nombre }}</span>
        </nav>

        <header class="encabezado">
          <span class="dc-spec-tile grande" aria-hidden="true">
            @if (especialidad.imagenUrl) {
              <img [src]="especialidad.imagenUrl" alt="" />
            } @else {
              <mat-icon>{{ visual().icono }}</mat-icon>
            }
          </span>
          <div class="titulo">
            <h1>{{ especialidad.nombre }}</h1>
          </div>
          <a mat-flat-button class="principal" routerLink="/disponibilidad">
            <mat-icon aria-hidden="true">event_available</mat-icon>
            Pedir cita
          </a>
        </header>

        <section aria-labelledby="titulo-tratamientos">
          <h2 id="titulo-tratamientos">Tratamientos</h2>
          @if (especialidad.tratamientos.length === 0) {
            <p class="vacio">Esta especialidad no tiene tratamientos publicados.</p>
          }
          <ul class="lista dc-grid">
            @for (tratamiento of especialidad.tratamientos; track tratamiento.id) {
              <li class="tarjeta">
                <h3>{{ tratamiento.nombre }}</h3>
                @if (tratamiento.descripcion) {
                  <p class="descripcion">{{ tratamiento.descripcion }}</p>
                }
                <p class="duracion">
                  <mat-icon aria-hidden="true">schedule</mat-icon>
                  {{ tratamiento.duracionMinutos }} minutos
                </p>
                <a
                  mat-stroked-button
                  class="cta"
                  [routerLink]="['/disponibilidad']"
                  [queryParams]="{ tratamientoId: tratamiento.id }"
                >
                  <mat-icon aria-hidden="true">event</mat-icon>
                  Pedir cita
                </a>
              </li>
            }
          </ul>
        </section>

        <section aria-labelledby="titulo-equipo">
          <h2 id="titulo-equipo">Quién la ejerce</h2>
          @if (especialidad.odontologos.length === 0) {
            <p class="vacio">Ahora mismo ningún odontólogo tiene asignada esta especialidad.</p>
          }
          <ul class="equipo dc-grid">
            @for (odontologo of especialidad.odontologos; track odontologo.id) {
              <li class="profesional">
                @if (odontologo.imagenUrl) {
                  <img class="avatar" [src]="odontologo.imagenUrl" alt="" />
                } @else {
                  <span class="avatar" aria-hidden="true">{{ iniciales(odontologo) }}</span>
                }
                <div>
                  <h3>{{ odontologo.nombres }} {{ odontologo.apellidos }}</h3>
                  <p class="cop">{{ odontologo.cop }}</p>
                </div>
              </li>
            }
          </ul>
        </section>
      </div>
    }
  `,
  styles: `
    .migas {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1);
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .migas a {
      color: var(--brand-ink);
    }
    .migas mat-icon {
      width: 1rem;
      height: 1rem;
      font-size: 1rem;
      color: var(--ink-faint);
    }
    .encabezado {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-5);
      margin: var(--space-5) 0 var(--space-2);
    }
    .grande {
      width: 3.5rem;
      height: 3.5rem;
      overflow: hidden;
    }
    .grande img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .titulo {
      flex: 1 1 18rem;
      min-width: 0;
    }
    h1 {
      margin: 0;
      font: var(--text-display-md);
      font-size: clamp(1.75rem, 3.4vw, 2.125rem);
      letter-spacing: -0.015em;
    }
    h2 {
      margin: var(--space-10) 0 var(--space-5);
      font: var(--text-title-lg);
    }
    .vacio {
      color: var(--ink-muted);
    }
    .lista,
    .equipo {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .tarjeta {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-5);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-3);
    }
    .tarjeta:hover {
      box-shadow: var(--shadow-sm);
      border-color: var(--border-strong);
    }
    .tarjeta h3,
    .profesional h3 {
      margin: 0;
      font: var(--text-title-sm);
    }
    .descripcion {
      margin: 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .duracion {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin: 0;
      font: var(--text-label);
      color: var(--ink-muted);
    }
    .duracion mat-icon {
      width: 1.125rem;
      height: 1.125rem;
      font-size: 1.125rem;
    }
    .cta {
      margin-top: auto;
    }
    .profesional {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-4);
    }
    .avatar {
      width: 3rem;
      height: 3rem;
      flex: none;
      border-radius: var(--radius-pill);
      object-fit: cover;
      display: grid;
      place-items: center;
      background: var(--spec-soft);
      color: var(--spec);
      font: 600 1rem/1 var(--font-display);
    }
    .cop {
      margin: 2px 0 0;
      font: var(--text-code);
      color: var(--ink-muted);
    }
    .error {
      color: var(--danger-ink);
    }
    @media (max-width: 37.5rem) {
      .principal {
        width: 100%;
        min-height: 3rem;
      }
    }
  `,
})
export class EspecialidadDetalleComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly servicio = inject(PublicoService);

  protected readonly detalle = signal<EspecialidadDetalle | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly visual = computed(() => visualDeEspecialidad(this.detalle()?.nombre));

  protected iniciales(odontologo: OdontologoPublico): string {
    return (odontologo.nombres.charAt(0) + odontologo.apellidos.charAt(0)).toUpperCase();
  }

  ngOnInit(): void {
    this.cargando.set(true);
    this.servicio.especialidad(this.id()).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
