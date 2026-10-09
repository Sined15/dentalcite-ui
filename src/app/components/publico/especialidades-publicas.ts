import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { EspecialidadPublica } from '../../models';
import { PublicoService } from '../../services/publico.service';
import { visualDeEspecialidad } from '../../shared/especialidad-visual';

@Component({
  selector: 'app-especialidades-publicas',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <nav class="migas" aria-label="Migas de pan">
      <a routerLink="/">Inicio</a>
      <mat-icon aria-hidden="true">chevron_right</mat-icon>
      <span aria-current="page">Especialidades</span>
    </nav>
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

    <ul class="galeria dc-grid">
      @for (especialidad of especialidades(); track especialidad.id) {
        <li class="tarjeta" [attr.data-spec]="visual(especialidad).clave">
          <div class="cabecera-tarjeta">
            <span class="dc-spec-tile" aria-hidden="true">
              @if (especialidad.imagenUrl) {
                <img [src]="especialidad.imagenUrl" alt="" />
              } @else {
                <mat-icon>{{ visual(especialidad).icono }}</mat-icon>
              }
            </span>
            <h2 class="nombre">{{ especialidad.nombre }}</h2>
          </div>
          <a mat-stroked-button [routerLink]="['/nuestras-especialidades', especialidad.id]">
            Ver especialidad
            <mat-icon iconPositionEnd aria-hidden="true">chevron_right</mat-icon>
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
    .galeria {
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
      gap: var(--space-4);
    }
    .tarjeta:hover {
      box-shadow: var(--shadow-sm);
      border-color: var(--border-strong);
    }
    .cabecera-tarjeta {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .dc-spec-tile {
      overflow: hidden;
    }
    .dc-spec-tile img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .nombre {
      margin: 0;
      font: var(--text-title-sm);
      min-width: 0;
    }
    .tarjeta a[mat-stroked-button] {
      margin-top: auto;
      align-self: flex-start;
    }
    .error {
      color: var(--danger-ink);
    }
  `,
})
export class EspecialidadesPublicas implements OnInit {
  private readonly servicio = inject(PublicoService);

  protected readonly especialidades = signal<EspecialidadPublica[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected visual(especialidad: EspecialidadPublica) {
    return visualDeEspecialidad(especialidad.nombre);
  }

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
