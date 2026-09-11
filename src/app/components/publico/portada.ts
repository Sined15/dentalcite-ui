import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { TratamientoPublico } from '../../models';
import { PublicoService } from '../../services/publico.service';

/**
 * La portada (HU-06, v4). Muestra **los tratamientos que la clinica ofrece**, que
 * es donde el informe situa el catalogo para el visitante; «mis tratamientos», en
 * el menu del paciente, son otra cosa: sus planes.
 *
 * Se carga sin token. Si la peticion falla, la pagina lo dice y sigue navegable:
 * una portada en blanco no distingue «no hay nada» de «algo se rompio».
 */
@Component({
  selector: 'app-portada',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <section class="titular">
      <h1>Cuida tu sonrisa en DentalCite</h1>
      <p>
        Consulta nuestras especialidades, conoce al equipo y reserva tu cita en línea.
        Para reservar necesitarás una cuenta; ver todo esto, no.
      </p>
      <div class="acciones">
        <a mat-flat-button color="primary" routerLink="/nuestras-especialidades">
          Ver especialidades
        </a>
        <a mat-stroked-button routerLink="/nuestro-equipo">Conocer al equipo</a>
      </div>
    </section>

    <h2>Tratamientos que ofrecemos</h2>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando tratamientos" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (!cargando() && !error() && tratamientos().length === 0) {
      <p>Todavía no hay tratamientos publicados.</p>
    }

    <ul class="rejilla">
      @for (tratamiento of tratamientos(); track tratamiento.id) {
        <li class="tarjeta">
          @if (tratamiento.imagenUrl) {
            <img [src]="tratamiento.imagenUrl" alt="" />
          } @else {
            <div class="marcador" aria-hidden="true"><mat-icon>medical_services</mat-icon></div>
          }
          <div class="cuerpo">
            <h3>{{ tratamiento.nombre }}</h3>
            <p class="especialidad">{{ tratamiento.especialidadNombre }}</p>
            @if (tratamiento.descripcion) {
              <p class="descripcion">{{ tratamiento.descripcion }}</p>
            }
            <p class="duracion">
              <mat-icon aria-hidden="true">schedule</mat-icon>
              {{ tratamiento.duracionMinutos }} minutos
            </p>
            <a
              mat-stroked-button
              [routerLink]="['/nuestras-especialidades', tratamiento.especialidadId]"
            >
              Ver especialidad
            </a>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .titular {
      padding: 1.5rem 0 2rem;
      max-width: 42rem;
    }
    .titular h1 {
      margin: 0 0 0.5rem;
      font-size: 2rem;
      line-height: 1.2;
    }
    .acciones {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    h2 {
      font-size: 1.35rem;
      margin: 1rem 0;
    }
    .rejilla {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1.25rem;
      grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    }
    .tarjeta {
      border: 1px solid var(--mat-sys-outline-variant, #d9d9d9);
      border-radius: 0.75rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .tarjeta img,
    .marcador {
      width: 100%;
      aspect-ratio: 3 / 2;
      object-fit: cover;
      display: block;
    }
    .marcador {
      display: grid;
      place-items: center;
      background: var(--mat-sys-surface-variant, #eceff1);
    }
    .cuerpo {
      padding: 0.85rem 1rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }
    .cuerpo h3 {
      margin: 0;
      font-size: 1.05rem;
    }
    .especialidad {
      margin: 0;
      font-size: 0.85rem;
      opacity: 0.75;
    }
    .descripcion {
      margin: 0;
      font-size: 0.9rem;
    }
    .duracion {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.25rem 0 0.5rem;
      font-size: 0.9rem;
    }
    .duracion mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .cuerpo a {
      margin-top: auto;
      align-self: flex-start;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class Portada implements OnInit {
  private readonly servicio = inject(PublicoService);

  protected readonly tratamientos = signal<TratamientoPublico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargando.set(true);
    this.servicio.tratamientos().subscribe({
      next: (lista) => {
        this.tratamientos.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
