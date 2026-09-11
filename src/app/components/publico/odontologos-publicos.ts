import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { mensajeDeError } from '../../core/http/api-error';
import { OdontologoPublico } from '../../models';
import { PublicoService } from '../../services/publico.service';

/**
 * El equipo (HU-06, v4). RF-10 pide **ficha, no tabla**: imagen, nombre,
 * especialidad y COP. Una rejilla de fichas es lo que el criterio enumera, y la
 * tabla con columnas de estado y acciones se queda en la consola de
 * administracion.
 *
 * `/api/v1/publico/odontologos` no devuelve `fichaId`, asi que aqui no hay nada
 * que ocultar: el dato no llega.
 */
@Component({
  selector: 'app-odontologos-publicos',
  imports: [MatIconModule, MatProgressBarModule],
  template: `
    <h1>Nuestro equipo</h1>
    <p class="entradilla">Los odontólogos que atienden en la clínica.</p>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando el equipo" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (!cargando() && !error() && odontologos().length === 0) {
      <p>Todavía no hay odontólogos publicados.</p>
    }

    <ul class="fichas">
      @for (odontologo of odontologos(); track odontologo.id) {
        <li class="ficha">
          @if (odontologo.imagenUrl) {
            <img [src]="odontologo.imagenUrl" alt="" />
          } @else {
            <div class="marcador" aria-hidden="true"><mat-icon>person</mat-icon></div>
          }
          <h2>{{ odontologo.nombres }} {{ odontologo.apellidos }}</h2>
          <p class="especialidades">{{ odontologo.especialidades.join(' · ') }}</p>
          <!-- El valor ya viene con el prefijo («COP-10001»): anteponer otro lo duplica. -->
          <p class="cop">{{ odontologo.cop }}</p>
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
    .fichas {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1.25rem;
      grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    }
    .ficha {
      border: 1px solid var(--mat-sys-outline-variant, #d9d9d9);
      border-radius: 0.75rem;
      padding: 1.1rem 1rem 1.25rem;
      text-align: center;
    }
    img,
    .marcador {
      width: 7rem;
      height: 7rem;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 0.75rem;
      display: block;
    }
    .marcador {
      display: grid;
      place-items: center;
      background: var(--mat-sys-surface-variant, #eceff1);
    }
    .ficha h2 {
      margin: 0 0 0.35rem;
      font-size: 1.05rem;
    }
    .especialidades {
      margin: 0 0 0.35rem;
      font-size: 0.9rem;
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
export class OdontologosPublicos implements OnInit {
  private readonly servicio = inject(PublicoService);

  protected readonly odontologos = signal<OdontologoPublico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargando.set(true);
    this.servicio.odontologos().subscribe({
      next: (lista) => {
        this.odontologos.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
