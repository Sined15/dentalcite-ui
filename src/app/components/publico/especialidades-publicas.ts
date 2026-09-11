import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { EspecialidadPublica } from '../../models';
import { PublicoService } from '../../services/publico.service';

/**
 * La galeria de especialidades (HU-06, v4): **una imagen con el nombre debajo**, y
 * nada mas. Ni descripcion, ni estado, ni acciones de mantenimiento.
 *
 * Que no aparezcan no depende de esta plantilla: `/api/v1/publico/especialidades`
 * no los manda. Ocultarlos aqui habria sido confiar la regla al cliente.
 */
@Component({
  selector: 'app-especialidades-publicas',
  imports: [RouterLink, MatIconModule, MatProgressBarModule],
  template: `
    <h1>Nuestras especialidades</h1>
    <p class="entradilla">Elige una para ver sus tratamientos y los odontólogos que la ejercen.</p>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando especialidades" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (!cargando() && !error() && especialidades().length === 0) {
      <p>Todavía no hay especialidades publicadas.</p>
    }

    <ul class="galeria">
      @for (especialidad of especialidades(); track especialidad.id) {
        <li>
          <a [routerLink]="['/nuestras-especialidades', especialidad.id]">
            @if (especialidad.imagenUrl) {
              <img [src]="especialidad.imagenUrl" alt="" />
            } @else {
              <div class="marcador" aria-hidden="true"><mat-icon>medical_services</mat-icon></div>
            }
            <span class="nombre">{{ especialidad.nombre }}</span>
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    h1 {
      font-size: 1.75rem;
      margin: 0.5rem 0 0.5rem;
    }
    .entradilla {
      margin: 0 0 1.5rem;
      opacity: 0.8;
    }
    .galeria {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1.25rem;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    }
    .galeria a {
      display: block;
      text-decoration: none;
      color: inherit;
      border-radius: 0.75rem;
      overflow: hidden;
      border: 1px solid var(--mat-sys-outline-variant, #d9d9d9);
    }
    .galeria a:hover,
    .galeria a:focus-visible {
      outline: 2px solid var(--mat-sys-primary, #1f6f8b);
      outline-offset: 2px;
    }
    img,
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
    .nombre {
      display: block;
      padding: 0.75rem 0.9rem;
      font-weight: 600;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class EspecialidadesPublicas implements OnInit {
  private readonly servicio = inject(PublicoService);

  protected readonly especialidades = signal<EspecialidadPublica[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargando.set(true);
    this.servicio.especialidades().subscribe({
      next: (lista) => {
        this.especialidades.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
