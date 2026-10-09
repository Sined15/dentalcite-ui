import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { OdontologoPublico } from '../../models';
import { PublicoService } from '../../services/publico.service';
import { visualDeEspecialidad } from '../../shared/especialidad-visual';

@Component({
  selector: 'app-odontologos-publicos',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <nav class="migas" aria-label="Migas de pan">
      <a routerLink="/">Inicio</a>
      <mat-icon aria-hidden="true">chevron_right</mat-icon>
      <span aria-current="page">Equipo</span>
    </nav>
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
        <li class="ficha" [attr.data-spec]="principal(odontologo)">
          <div class="arriba">
            @if (odontologo.imagenUrl) {
              <img class="avatar" [src]="odontologo.imagenUrl" alt="" />
            } @else {
              <span class="avatar" aria-hidden="true">{{ iniciales(odontologo) }}</span>
            }
            <div class="datos">
              <h2>{{ odontologo.nombres }} {{ odontologo.apellidos }}</h2>
              <p class="cop">{{ odontologo.cop }}</p>
            </div>
          </div>
          <p class="especialidades">{{ odontologo.especialidades.join(' · ') }}</p>
          <a mat-stroked-button routerLink="/disponibilidad">
            <mat-icon aria-hidden="true">event</mat-icon>
            Ver horarios
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    .migas {
      display: flex;
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
    h1 {
      margin: var(--space-4) 0 0;
      font: var(--text-display-md);
      font-size: clamp(1.75rem, 3.4vw, 2.125rem);
      letter-spacing: -0.015em;
    }
    .entradilla {
      margin: var(--space-2) 0 var(--space-8);
      max-width: var(--layout-prose);
      color: var(--ink-muted);
    }
    .fichas {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-6);
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 18.75rem), 1fr));
    }
    .ficha {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .ficha:hover {
      box-shadow: var(--shadow-sm);
      border-color: var(--border-strong);
    }
    .arriba {
      display: flex;
      align-items: center;
      gap: var(--space-4);
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
    .datos {
      min-width: 0;
    }
    .ficha h2 {
      margin: 0;
      font: var(--text-title-sm);
    }
    .cop {
      margin: 2px 0 0;
      font: var(--text-code);
      color: var(--ink-muted);
    }
    .especialidades {
      margin: 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .ficha a {
      align-self: flex-start;
      margin-top: auto;
    }
    .error {
      color: var(--danger-ink);
    }
    @media (max-width: 37.5rem) {
      .ficha a {
        align-self: stretch;
        min-height: 2.75rem;
      }
    }
  `,
})
export class OdontologosPublicos implements OnInit {
  private readonly servicio = inject(PublicoService);

  protected readonly odontologos = signal<OdontologoPublico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Color del avatar: sale de su especialidad principal, nunca de un hash del nombre. */
  protected principal(odontologo: OdontologoPublico): string | null {
    return visualDeEspecialidad(odontologo.especialidades[0]).clave;
  }

  protected iniciales(odontologo: OdontologoPublico): string {
    return (odontologo.nombres.charAt(0) + odontologo.apellidos.charAt(0)).toUpperCase();
  }

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
