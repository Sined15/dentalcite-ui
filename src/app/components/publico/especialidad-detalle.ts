import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { EspecialidadDetalle } from '../../models';
import { PublicoService } from '../../services/publico.service';

/**
 * Una especialidad con sus tratamientos y sus odontologos (HU-06, v4). Es la
 * segunda mitad de «donde queda el catalogo de lo que la clinica ofrece»: en la
 * portada y dentro de cada especialidad.
 *
 * Los odontologos que aparecen son los que el motor de disponibilidad propondria
 * para esta especialidad (RN-08): el backend los resuelve con la misma consulta,
 * asi que la web no puede anunciar a alguien con quien luego no se pueda reservar.
 *
 * Cada tratamiento lleva su «pedir cita», que es el ultimo criterio de HU-06. El
 * destino es la pantalla de disponibilidad con el tratamiento ya elegido, y no un
 * formulario propio: la reserva vive en un solo sitio (HU-09, HU-14) y tenerla
 * dos veces seria mantenerla dos veces. Al visitante lo desviara al login la
 * guardia de esa ruta, que le devuelve aqui mismo despues de entrar.
 */
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
      <nav class="migas">
        <a routerLink="/nuestras-especialidades">Especialidades</a>
        <span aria-hidden="true">/</span>
        <span>{{ especialidad.nombre }}</span>
      </nav>

      <header class="encabezado">
        @if (especialidad.imagenUrl) {
          <img [src]="especialidad.imagenUrl" alt="" />
        }
        <h1>{{ especialidad.nombre }}</h1>
      </header>

      <h2>Tratamientos</h2>
      @if (especialidad.tratamientos.length === 0) {
        <p>Esta especialidad no tiene tratamientos publicados.</p>
      }
      <ul class="lista">
        @for (tratamiento of especialidad.tratamientos; track tratamiento.id) {
          <li>
            <h3>{{ tratamiento.nombre }}</h3>
            @if (tratamiento.descripcion) {
              <p>{{ tratamiento.descripcion }}</p>
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

      <h2>Quién la ejerce</h2>
      @if (especialidad.odontologos.length === 0) {
        <p>Ahora mismo ningún odontólogo tiene asignada esta especialidad.</p>
      }
      <ul class="equipo">
        @for (odontologo of especialidad.odontologos; track odontologo.id) {
          <li>
            @if (odontologo.imagenUrl) {
              <img [src]="odontologo.imagenUrl" alt="" />
            } @else {
              <div class="marcador" aria-hidden="true"><mat-icon>person</mat-icon></div>
            }
            <div>
              <h3>{{ odontologo.nombres }} {{ odontologo.apellidos }}</h3>
              <p class="cop">{{ odontologo.cop }}</p>
            </div>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .migas {
      display: flex;
      gap: 0.5rem;
      font-size: 0.9rem;
      margin-bottom: 1rem;
      opacity: 0.85;
    }
    .migas a {
      color: inherit;
    }
    .encabezado {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .encabezado img {
      width: 8rem;
      aspect-ratio: 3 / 2;
      object-fit: cover;
      border-radius: 0.5rem;
    }
    .encabezado h1 {
      margin: 0;
      font-size: 1.75rem;
    }
    h2 {
      font-size: 1.2rem;
      margin: 1.5rem 0 0.75rem;
    }
    .lista,
    .equipo {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1rem;
    }
    .lista {
      grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    }
    .lista li {
      border: 1px solid var(--mat-sys-outline-variant, #d9d9d9);
      border-radius: 0.75rem;
      padding: 0.9rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .cta {
      margin-top: 0.35rem;
    }
    .lista h3,
    .equipo h3 {
      margin: 0 0 0.35rem;
      font-size: 1rem;
    }
    .lista p {
      margin: 0 0 0.35rem;
      font-size: 0.9rem;
    }
    .duracion {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .duracion mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .equipo {
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    }
    .equipo li {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      border: 1px solid var(--mat-sys-outline-variant, #d9d9d9);
      border-radius: 0.75rem;
      padding: 0.75rem 0.9rem;
    }
    .equipo img,
    .marcador {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 50%;
      object-fit: cover;
      flex: none;
    }
    .marcador {
      display: grid;
      place-items: center;
      background: var(--mat-sys-surface-variant, #eceff1);
    }
    .cop {
      margin: 0;
      font-size: 0.85rem;
      opacity: 0.75;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class EspecialidadDetalleComponent implements OnInit {
  /** Llega de la ruta con `withComponentInputBinding`. */
  readonly id = input.required<string>();

  private readonly servicio = inject(PublicoService);

  protected readonly detalle = signal<EspecialidadDetalle | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

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
