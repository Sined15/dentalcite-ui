import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { Rol } from './models';

interface EntradaMenu {
  ruta: string;
  etiqueta: string;
  icono: string;
  roles: readonly Rol[];
}

/** Rutas que se muestran sin el shell. */
const RUTAS_PUBLICAS = ['/login', '/registro', '/cambiar-password'];

/**
 * Ancho a partir del cual el cajon de navegacion cabe junto al contenido.
 *
 * 56.25rem = 900 px: por debajo, las 15rem del cajon se comen la mitad util de
 * un movil, asi que pasa a superponerse y arranca cerrado.
 */
const ANCHO_ESCRITORIO = '(min-width: 56.25rem)';

const MENU: readonly EntradaMenu[] = [
  {
    ruta: '/usuarios',
    etiqueta: 'Cuentas',
    icono: 'manage_accounts',
    roles: ['ADMINISTRADOR'],
  },
  {
    ruta: '/especialidades',
    etiqueta: 'Especialidades',
    icono: 'medical_services',
    roles: ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  },
  {
    ruta: '/tratamientos',
    etiqueta: 'Tratamientos',
    icono: 'healing',
    roles: ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  },
  {
    ruta: '/odontologos',
    etiqueta: 'Odontologos',
    icono: 'groups',
    roles: ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  },
  {
    ruta: '/bloqueos',
    etiqueta: 'Bloqueos de agenda',
    icono: 'event_busy',
    roles: ['ODONTOLOGO', 'RECEPCIONISTA', 'ADMINISTRADOR'],
  },
  {
    ruta: '/disponibilidad',
    etiqueta: 'Disponibilidad',
    icono: 'event_available',
    roles: ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  },
  {
    ruta: '/pacientes/nuevo',
    etiqueta: 'Registrar paciente',
    icono: 'person_add',
    roles: ['RECEPCIONISTA', 'ADMINISTRADOR'],
  },
  {
    ruta: '/citas',
    etiqueta: 'Agenda',
    icono: 'event_note',
    roles: ['RECEPCIONISTA', 'ADMINISTRADOR'],
  },
];

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly puntosDeCorte = inject(BreakpointObserver);

  protected readonly rol = this.auth.rol;
  protected readonly estaAutenticado = this.auth.estaAutenticado;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** El shell no envuelve las pantallas de acceso. */
  protected readonly mostrarShell = computed(
    () => this.estaAutenticado() && !RUTAS_PUBLICAS.some((r) => this.url().startsWith(r)),
  );

  /**
   * `initialValue` se resuelve con `isMatched` y no con un `false` fijo: el
   * observable emite despues del primer render, y arrancar suponiendo movil
   * hacia que en escritorio el cajon apareciese cerrado y saltase a abierto.
   */
  protected readonly esEscritorio = toSignal(
    this.puntosDeCorte.observe(ANCHO_ESCRITORIO).pipe(map((estado) => estado.matches)),
    { initialValue: this.puntosDeCorte.isMatched(ANCHO_ESCRITORIO) },
  );

  /** `side` reserva su ancho junto al contenido; `over` lo superpone con velo. */
  protected readonly modoCajon = computed(() => (this.esEscritorio() ? 'side' : 'over'));

  /**
   * Estado abierto/cerrado del cajon. Es propio y no derivado, porque el usuario
   * lo alterna con el boton de la barra; el efecto de abajo solo lo reajusta
   * cuando se cruza el punto de corte (girar el movil, redimensionar).
   */
  protected readonly cajonAbierto = signal(this.puntosDeCorte.isMatched(ANCHO_ESCRITORIO));

  constructor() {
    effect(() => {
      this.cajonAbierto.set(this.esEscritorio());
    });

    // Superpuesto, el cajon tapa el contenido: navegar sin cerrarlo dejaria al
    // usuario mirando el menu en vez de la pantalla que acaba de pedir.
    effect(() => {
      this.url();
      if (!this.esEscritorio()) {
        this.cajonAbierto.set(false);
      }
    });
  }

  /**
   * El menu se filtra con la misma tabla de roles que usan los guards: una
   * entrada visible que devolviera 403 al pulsarla seria un fallo de diseno.
   * Ocultarla no sustituye al guard — hacen falta los dos.
   */
  protected readonly entradas = computed<EntradaMenu[]>(() => {
    const rol = this.rol();
    return rol ? MENU.filter((e) => e.roles.includes(rol)) : [];
  });

  protected cerrarSesion(): void {
    this.auth.logout();
  }
}
