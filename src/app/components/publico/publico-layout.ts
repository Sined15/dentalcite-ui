import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-publico-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  template: `
    <header class="barra">
      <div class="dc-container barra-interior">
        <a class="marca" routerLink="/" aria-label="DentalCite, ir a inicio">
          <span class="sello" aria-hidden="true"><mat-icon>medical_services</mat-icon></span>
          <span>Dental<b>Cite</b></span>
        </a>

        <nav class="navegacion" aria-label="Secciones de la clínica">
          <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }"
            >Inicio</a
          >
          <a routerLink="/nuestras-especialidades" routerLinkActive="activo">Especialidades</a>
          <a routerLink="/nuestro-equipo" routerLinkActive="activo">Equipo</a>
          <a routerLink="/disponibilidad" routerLinkActive="activo">Pedir cita</a>
        </nav>

        <div class="acceso">
          @if (estaAutenticado()) {
            <a mat-stroked-button [routerLink]="rutaDeSuArea()">
              <mat-icon aria-hidden="true">account_circle</mat-icon>
              Ir a mi cuenta
            </a>
          } @else {
            <a mat-button routerLink="/registro">Registrarse</a>
            <a mat-stroked-button routerLink="/login">Iniciar sesión</a>
          }
        </div>

        <button
          class="hamburguesa"
          type="button"
          (click)="menuAbierto.set(!menuAbierto())"
          [attr.aria-expanded]="menuAbierto()"
          aria-controls="menu-movil"
          aria-label="Abrir o cerrar el menú"
        >
          <mat-icon aria-hidden="true">{{ menuAbierto() ? 'close' : 'menu' }}</mat-icon>
        </button>
      </div>

      @if (menuAbierto()) {
        <div class="menu-movil" id="menu-movil">
          <div class="dc-container menu-movil-interior">
            <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }"
              >Inicio</a
            >
            <a routerLink="/nuestras-especialidades" routerLinkActive="activo">Especialidades</a>
            <a routerLink="/nuestro-equipo" routerLinkActive="activo">Equipo</a>
            <a routerLink="/disponibilidad" routerLinkActive="activo">Pedir cita</a>
            <div class="menu-movil-acceso">
              @if (estaAutenticado()) {
                <a mat-stroked-button [routerLink]="rutaDeSuArea()">Ir a mi cuenta</a>
              } @else {
                <a mat-stroked-button routerLink="/login">Iniciar sesión</a>
                <a mat-button routerLink="/registro">Registrarse</a>
              }
            </div>
          </div>
        </div>
      }
    </header>

    <main class="contenido dc-container">
      <router-outlet />
    </main>

    <footer class="pie">
      <div class="dc-container">
        <p>DentalCite · Clínica dental. Reservar una cita requiere iniciar sesión.</p>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    .barra {
      position: sticky;
      top: 0;
      z-index: 5;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .barra-interior {
      height: var(--layout-navbar);
      display: flex;
      align-items: center;
      gap: var(--space-6);
    }
    .marca {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font: 700 1.1875rem/1 var(--font-display);
      letter-spacing: -0.01em;
      text-decoration: none;
      color: var(--ink);
      margin-right: auto;
    }
    .marca b {
      color: var(--brand-ink);
    }
    .sello {
      width: 1.875rem;
      height: 1.875rem;
      border-radius: var(--radius-sm);
      background: var(--brand);
      color: var(--on-brand);
      display: grid;
      place-items: center;
    }
    .sello mat-icon {
      width: 1.125rem;
      height: 1.125rem;
      font-size: 1.125rem;
    }
    .navegacion {
      display: flex;
      gap: var(--space-5);
    }
    .navegacion a {
      text-decoration: none;
      color: var(--ink-muted);
      font: 500 0.875rem/1 var(--font-sans);
      padding: var(--space-2) 0;
      border-bottom: 2px solid transparent;
    }
    .navegacion a:hover {
      color: var(--ink);
    }
    .navegacion a.activo {
      color: var(--ink);
      border-bottom-color: var(--brand);
    }
    .acceso {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .hamburguesa {
      display: none;
      width: 2.75rem;
      height: 2.75rem;
      place-items: center;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-pill);
      background: none;
      color: var(--ink);
      cursor: pointer;
    }
    .menu-movil {
      background: var(--surface);
      border-top: 1px solid var(--border);
      box-shadow: var(--shadow-md);
    }
    .menu-movil-interior {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding-block: var(--space-4);
    }
    .menu-movil-interior > a {
      display: flex;
      align-items: center;
      min-height: 3rem;
      padding: 0 var(--space-3);
      border-radius: var(--radius-sm);
      text-decoration: none;
      color: var(--ink);
      font: 500 1rem/1 var(--font-sans);
    }
    .menu-movil-interior > a.activo {
      background: var(--brand-soft);
      color: var(--on-brand-soft);
    }
    .menu-movil-acceso {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
    .menu-movil-acceso a {
      min-height: 2.75rem;
    }
    .contenido {
      flex: 1;
      padding-block: var(--space-6) var(--space-12);
    }
    .pie {
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding-block: var(--space-5);
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .pie p {
      margin: 0;
    }
    @media (max-width: 47.5rem) {
      .navegacion,
      .acceso {
        display: none;
      }
      .hamburguesa {
        display: grid;
      }
      .barra-interior {
        gap: var(--space-3);
      }
    }
    @media (max-width: 37.5rem) {
      .dc-container {
        padding-inline: var(--space-4);
      }
    }
  `,
})
export class PublicoLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly estaAutenticado = this.auth.estaAutenticado;
  protected readonly menuAbierto = signal(false);

  constructor() {
    // Al navegar, el menú desplegable se cierra solo: la página nueva es lo que se quería ver.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuAbierto.set(false));
  }

  protected rutaDeSuArea(): string {
    return this.auth.rutaInicial();
  }
}
