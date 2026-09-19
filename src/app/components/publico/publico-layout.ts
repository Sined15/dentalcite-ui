import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/**
 * El marco del area publica (HU-06, v4). No es el shell de la aplicacion: quien
 * llega sin cuenta no tiene cajon de navegacion ni rol que mostrar, y ver uno
 * vacio seria peor que no verlo.
 *
 * El boton de sesion va **arriba a la izquierda**, junto a la marca, porque es lo
 * unico que separa mirar de reservar y el criterio (v4) lo situa ahi. Con sesion
 * abierta el mismo hueco lleva de vuelta a su area, para que el area publica no
 * sea un callejon sin salida.
 */
@Component({
  selector: 'app-publico-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  template: `
    <header class="cabecera">
      <div class="izquierda">
        <a class="marca" routerLink="/">
          <mat-icon aria-hidden="true">dentistry</mat-icon>
          <span>DentalCite</span>
        </a>

        @if (estaAutenticado()) {
          <a mat-flat-button color="primary" [routerLink]="rutaDeSuArea()">
            <mat-icon aria-hidden="true">account_circle</mat-icon>
            Ir a mi cuenta
          </a>
        } @else {
          <a mat-flat-button color="primary" routerLink="/login">Iniciar sesión</a>
          <a mat-stroked-button routerLink="/registro">Registrarse</a>
        }
      </div>

      <nav class="navegacion" aria-label="Secciones de la clínica">
        <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }"
          >Inicio</a
        >
        <a routerLink="/nuestras-especialidades" routerLinkActive="activo">Especialidades</a>
        <a routerLink="/nuestro-equipo" routerLinkActive="activo">Equipo</a>
        <a routerLink="/disponibilidad" routerLinkActive="activo">Pedir cita</a>
      </nav>
    </header>

    <main class="contenido">
      <router-outlet />
    </main>

    <footer class="pie">
      <p>DentalCite · Clínica dental. Reservar una cita requiere iniciar sesión.</p>
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    .cabecera {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #d9d9d9);
    }
    .izquierda {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .marca {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 1.15rem;
      font-weight: 600;
      text-decoration: none;
      color: inherit;
      margin-right: 0.5rem;
    }
    .navegacion {
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .navegacion a {
      text-decoration: none;
      color: inherit;
      padding: 0.25rem 0;
      border-bottom: 2px solid transparent;
    }
    .navegacion a.activo {
      border-bottom-color: var(--mat-sys-primary, #1f6f8b);
      font-weight: 600;
    }
    .contenido {
      flex: 1;
      padding: 1.5rem 1.25rem 2.5rem;
      max-width: 72rem;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .pie {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--mat-sys-outline-variant, #d9d9d9);
      font-size: 0.85rem;
      opacity: 0.8;
    }
    .pie p {
      margin: 0;
      max-width: 72rem;
      margin-inline: auto;
    }
  `,
})
export class PublicoLayout {
  private readonly auth = inject(AuthService);

  protected readonly estaAutenticado = this.auth.estaAutenticado;

  protected rutaDeSuArea(): string {
    return this.auth.rutaInicial();
  }
}
