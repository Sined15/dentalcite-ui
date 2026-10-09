import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import { Rol, Usuario } from '../../models';
import { UsuarioService } from '../../services/usuario.service';

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administración',
  RECEPCIONISTA: 'Recepción',
  ODONTOLOGO: 'Odontólogo',
  PACIENTE: 'Paciente',
};

@Component({
  selector: 'app-perfil',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  template: `
    <h1>Mi perfil</h1>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando perfil" />
    } @else if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    } @else if (usuario(); as u) {
      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="persona">
            <span class="iniciales" aria-hidden="true">{{ iniciales() }}</span>
            <div>
              <h2>{{ u.nombre }}</h2>
              <span class="rol">{{ etiquetaRol() }}</span>
            </div>
          </div>
          <dl>
            <dt>Correo</dt>
            <dd>{{ u.correo }}</dd>
            <dt>Estado</dt>
            <dd>
              <span
                class="dc-estado"
                [class.dc-estado--ok]="u.activo"
                [class.dc-estado--error]="!u.activo"
              >
                <mat-icon aria-hidden="true">{{ u.activo ? 'check_circle' : 'block' }}</mat-icon>
                {{ u.activo ? 'Cuenta activa' : 'Cuenta desactivada' }}
              </span>
            </dd>
            @if (u.fichaId && u.rol === 'PACIENTE') {
              <dt>Ficha clínica</dt>
              <dd><a class="enlace" [routerLink]="['/pacientes', u.fichaId]">Ver mi ficha</a></dd>
            }
          </dl>
          <p class="pie">Para cambiar tus datos, pídeselo a Administración.</p>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined" class="seguridad">
        <mat-card-content>
          <h2>Seguridad</h2>
          <p>
            Al cambiar la contraseña se cierran las sesiones abiertas con tu cuenta y tendrás que
            volver a entrar.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <a mat-stroked-button routerLink="/cambiar-password">
            <mat-icon aria-hidden="true">key</mat-icon>
            Cambiar contraseña
          </a>
          <button mat-button type="button" class="salir" (click)="cerrarSesion()">
            <mat-icon aria-hidden="true">logout</mat-icon>
            Cerrar sesión
          </button>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: `
    h1 {
      font: var(--text-display-sm);
      letter-spacing: -0.01em;
      margin: 0 0 var(--space-5);
    }
    h2 {
      font: var(--text-title-md);
      margin: 0;
    }
    mat-card {
      max-width: 34rem;
      margin-bottom: var(--space-4);
    }
    .persona {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }
    .iniciales {
      width: 4rem;
      height: 4rem;
      flex: none;
      display: grid;
      place-items: center;
      border-radius: var(--radius-pill);
      background: var(--brand-soft);
      color: var(--on-brand-soft);
      font: 700 1.375rem/1 var(--font-display);
    }
    .rol {
      display: inline-block;
      margin-top: var(--space-2);
      padding: 6px var(--space-3);
      border-radius: var(--radius-pill);
      background: var(--brand-soft);
      color: var(--on-brand-soft);
      font: var(--text-label);
    }
    dl {
      display: grid;
      grid-template-columns: minmax(8rem, auto) 1fr;
      gap: var(--space-2) var(--space-4);
      margin: 0;
    }
    dt {
      font: var(--text-label);
      color: var(--ink-muted);
      padding-top: 2px;
    }
    dd {
      margin: 0;
    }
    .enlace {
      color: var(--accent-ink);
      text-decoration: underline;
    }
    .salir {
      --mat-button-text-label-text-color: var(--danger-ink);
    }
    .pie {
      margin: var(--space-5) 0 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .seguridad p {
      margin: var(--space-2) 0 0;
      color: var(--ink-muted);
    }
    .seguridad mat-card-actions {
      padding: 0 var(--space-4) var(--space-4);
    }
    @media (max-width: 30rem) {
      dl {
        grid-template-columns: 1fr;
        gap: 0.125rem;
      }
      dd:not(:last-child) {
        margin-bottom: var(--space-3);
      }
    }
    .error {
      color: var(--danger-ink);
    }
  `,
})
export class Perfil {
  private readonly usuarios = inject(UsuarioService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly etiquetaRol = computed(() => {
    const rol = this.usuario()?.rol;
    return rol ? (ETIQUETA_ROL[rol] ?? rol) : '';
  });

  protected readonly iniciales = computed(() => {
    const partes = (this.usuario()?.nombre ?? '').trim().split(/\s+/).filter(Boolean);
    return (partes[0]?.charAt(0) ?? '') + (partes[1]?.charAt(0) ?? '') || '?';
  });

  protected cerrarSesion(): void {
    this.auth.logout();
  }

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
