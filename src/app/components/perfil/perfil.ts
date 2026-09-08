import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { Usuario } from '../../models';
import { UsuarioService } from '../../services/usuario.service';

/** GET /api/v1/usuarios/me — accesible a cualquier rol sobre su propia cuenta. */
@Component({
  selector: 'app-perfil',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatProgressBarModule],
  template: `
    <h1>Mi perfil</h1>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando perfil" />
    } @else if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    } @else if (usuario(); as u) {
      <mat-card>
        <mat-card-content>
          <dl>
            <dt>Nombre</dt>
            <dd>{{ u.nombre }}</dd>
            <dt>Correo</dt>
            <dd>{{ u.correo }}</dd>
            <dt>Rol</dt>
            <dd>{{ u.rol }}</dd>
            <dt>Estado</dt>
            <dd>{{ u.activo ? 'Activa' : 'Desactivada' }}</dd>
            @if (u.fichaId) {
              <dt>Ficha clínica</dt>
              <dd class="mono">{{ u.fichaId }}</dd>
            }
          </dl>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/cambiar-password">Cambiar contraseña</a>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: `
    h1 {
      font-size: 1.5rem;
      margin: 0 0 1rem;
    }
    mat-card {
      max-width: 34rem;
    }
    dl {
      display: grid;
      grid-template-columns: minmax(8rem, auto) 1fr;
      gap: 0.5rem 1rem;
      margin: 0;
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0;
    }
    .mono {
      font-family: monospace;
      font-size: 0.8125rem;
      // Un UUID no tiene espacios donde partir: sin esto desbordaba su columna
      // y estiraba la tarjeta mas alla del ancho del movil.
      overflow-wrap: anywhere;
    }
    // Por debajo de este ancho las dos columnas dejan al valor una franja
    // demasiado estrecha; etiqueta y valor pasan a filas consecutivas.
    @media (max-width: 30rem) {
      dl {
        grid-template-columns: 1fr;
        gap: 0.125rem;
      }
      dd:not(:last-child) {
        margin-bottom: 0.75rem;
      }
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class Perfil {
  private readonly usuarios = inject(UsuarioService);

  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.usuarios.obtenerPerfilPropio().subscribe({
      next: (u) => {
        this.usuario.set(u);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
