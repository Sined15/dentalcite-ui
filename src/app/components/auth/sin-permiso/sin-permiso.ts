import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sin-permiso',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <main class="pantalla">
      <span class="insignia" aria-hidden="true"><mat-icon>lock</mat-icon></span>
      <p class="codigo">Error 403</p>
      <h1>No tienes permiso para ver esto</h1>
      <p class="texto">
        Tu rol ({{ rol() ?? 'sin definir' }}) no incluye esta sección. Si crees que debería,
        pídele acceso a quien administra la clínica.
      </p>
      <div class="acciones">
        <button mat-flat-button type="button" (click)="volver()">
          <mat-icon aria-hidden="true">home</mat-icon>
          Volver a mi inicio
        </button>
      </div>
    </main>
  `,
  styles: `
    .pantalla {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-4);
      max-width: var(--layout-form);
      margin: var(--space-10) auto;
      padding-inline: var(--space-2);
    }
    .insignia {
      width: 4rem;
      height: 4rem;
      display: grid;
      place-items: center;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      background: var(--surface);
      color: var(--ink-muted);
    }
    .insignia mat-icon {
      width: 1.875rem;
      height: 1.875rem;
      font-size: 1.875rem;
    }
    .codigo {
      margin: 0;
      font: var(--text-code);
      color: var(--ink-muted);
    }
    h1 {
      margin: 0;
      font: var(--text-display-sm);
      letter-spacing: -0.01em;
    }
    .texto {
      margin: 0;
      font: var(--text-body-lg);
      color: var(--ink-muted);
    }
    .acciones {
      width: 100%;
    }
    @media (max-width: 37.5rem) {
      .acciones button {
        width: 100%;
        min-height: 3rem;
      }
    }
  `,
})
export class SinPermiso {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly rol = this.auth.rol;

  protected volver(): void {
    void this.router.navigateByUrl(this.auth.rutaInicial());
  }
}
