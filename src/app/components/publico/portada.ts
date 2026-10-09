import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { TratamientoPublico } from '../../models';
import { PublicoService } from '../../services/publico.service';
import { visualDeEspecialidad } from '../../shared/especialidad-visual';

@Component({
  selector: 'app-portada',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <section class="heroe">
      <div class="heroe-texto">
        <p class="rotulo">CLÍNICA DENTAL</p>
        <h1>Cuida tu sonrisa en DentalCite</h1>
        <p class="entradilla">
          Consulta nuestras especialidades, conoce al equipo y reserva tu cita en línea.
          Para reservar necesitarás una cuenta; ver todo esto, no.
        </p>
        <div class="acciones">
          <a mat-flat-button routerLink="/disponibilidad">
            <mat-icon aria-hidden="true">event_available</mat-icon>
            Pedir cita
          </a>
          <a mat-stroked-button routerLink="/nuestras-especialidades">Ver especialidades</a>
          <a mat-button routerLink="/nuestro-equipo">Conocer al equipo</a>
        </div>
        <ul class="datos">
          <li>
            <mat-icon aria-hidden="true">visibility</mat-icon>
            <span>Puedes ver tratamientos, equipo y horarios sin cuenta.</span>
          </li>
          <li>
            <mat-icon aria-hidden="true">keyboard_return</mat-icon>
            <span>Al iniciar sesión volverás aquí, con la misma hora elegida.</span>
          </li>
        </ul>
      </div>

      <aside class="pasos" aria-labelledby="titulo-pasos">
        <h2 id="titulo-pasos">Reservar toma tres pasos</h2>
        <ol>
          <li>
            <span class="numero" aria-hidden="true">1</span>
            <div>
              <h3>Elige un tratamiento</h3>
              <p>Mira la duración y qué especialidad lo ejerce.</p>
            </div>
          </li>
          <li>
            <span class="numero" aria-hidden="true">2</span>
            <div>
              <h3>Mira las franjas</h3>
              <p>Compara días y odontólogos sin iniciar sesión.</p>
            </div>
          </li>
          <li>
            <span class="numero" aria-hidden="true">3</span>
            <div>
              <h3>Identifícate y confirma</h3>
              <p>Al entrar volverás a la hora que elegiste.</p>
            </div>
          </li>
        </ol>
      </aside>
    </section>

    <section class="seccion" aria-labelledby="titulo-tratamientos">
      <h2 id="titulo-tratamientos">Tratamientos que ofrecemos</h2>
      <p class="subtitulo">
        Cada especialidad tiene su color y su icono para que la reconozcas antes de leer.
      </p>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando tratamientos" />
      }

      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }

      @if (!cargando() && !error() && tratamientos().length === 0) {
        <p>Todavía no hay tratamientos publicados.</p>
      }

      <ul class="rejilla dc-grid">
        @for (tratamiento of tratamientos(); track tratamiento.id) {
          <li class="tarjeta" [attr.data-spec]="visual(tratamiento).clave">
            <p class="rotulo-spec">{{ tratamiento.especialidadNombre.toUpperCase() }}</p>
            <div class="cabecera-tarjeta">
              <span class="dc-spec-tile" aria-hidden="true">
                <mat-icon>{{ visual(tratamiento).icono }}</mat-icon>
              </span>
              <h3>{{ tratamiento.nombre }}</h3>
            </div>
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
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .heroe {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: var(--space-12);
      align-items: center;
      padding-block: var(--space-10) var(--space-8);
    }
    .heroe-texto {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }
    .rotulo {
      margin: 0;
      font: var(--text-overline);
      letter-spacing: 0.08em;
      color: var(--brand-ink);
    }
    h1 {
      margin: 0;
      font: var(--text-display-lg);
      font-size: clamp(2rem, 5vw, 2.75rem);
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .entradilla {
      margin: 0;
      max-width: var(--layout-prose);
      font: var(--text-body-lg);
      color: var(--ink-muted);
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: center;
    }
    .datos {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-3);
    }
    .datos li {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .datos mat-icon {
      flex: none;
      color: var(--brand-ink);
    }
    .pasos {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      box-shadow: var(--shadow-sm);
    }
    .pasos h2 {
      margin: 0 0 var(--space-4);
      font: var(--text-title-md);
    }
    .pasos ol {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-4);
    }
    .pasos li {
      display: flex;
      gap: var(--space-4);
      align-items: flex-start;
    }
    .numero {
      flex: none;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius-pill);
      background: var(--brand-soft);
      color: var(--on-brand-soft);
      display: grid;
      place-items: center;
      font: 700 1rem/1 var(--font-display);
    }
    .pasos h3 {
      margin: 0;
      font: var(--text-title-sm);
    }
    .pasos p {
      margin: var(--space-1) 0 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .seccion {
      padding-block: var(--space-8);
    }
    .seccion h2 {
      margin: 0;
      font: var(--text-title-lg);
    }
    .subtitulo {
      margin: var(--space-2) 0 var(--space-8);
      max-width: var(--layout-prose);
      color: var(--ink-muted);
    }
    .rejilla {
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
      gap: var(--space-3);
    }
    .tarjeta:hover {
      box-shadow: var(--shadow-sm);
      border-color: var(--border-strong);
    }
    .rotulo-spec {
      margin: 0;
      font: var(--text-overline);
      letter-spacing: 0.08em;
      color: var(--spec);
    }
    .cabecera-tarjeta {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .cabecera-tarjeta h3 {
      margin: 0;
      font: var(--text-title-sm);
      min-width: 0;
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
    .tarjeta a {
      margin-top: auto;
      align-self: flex-start;
    }
    .error {
      color: var(--danger-ink);
    }
    @media (max-width: 56rem) {
      .heroe {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-8);
        padding-block: var(--space-6) var(--space-4);
      }
    }
    @media (max-width: 37.5rem) {
      .acciones a {
        flex: 1 1 100%;
        min-height: 3rem;
      }
      .pasos {
        padding: var(--space-5);
      }
      .seccion {
        padding-block: var(--space-6);
      }
    }
  `,
})
export class Portada implements OnInit {
  private readonly servicio = inject(PublicoService);

  protected readonly tratamientos = signal<TratamientoPublico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected visual(tratamiento: TratamientoPublico) {
    return visualDeEspecialidad(tratamiento.especialidadNombre);
  }

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
