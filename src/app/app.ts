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

interface EntradaMenuHija {
  ruta: string;
  etiqueta: string;
}

/**
 * Una entrada del cajon de navegacion.
 *
 * `ruta` es `null` cuando la entrada es un grupo: la cabecera despliega a sus
 * hijos y no lleva a ninguna parte por si misma, porque llevar a un sitio *y*
 * abrir un submenu son dos respuestas distintas al mismo clic.
 */
interface EntradaMenu {
  ruta: string | null;
  etiqueta: string;
  icono: string;
  roles: readonly Rol[];
  hijos?: readonly EntradaMenuHija[];
}

/**
 * Rutas que se muestran sin el shell: las de acceso y, desde la revision v4, el
 * area publica, que trae su propia cabecera (`PublicoLayout`). Envolverla tambien
 * con el shell pintaria dos barras superpuestas a quien tuviera sesion abierta.
 */
const RUTAS_PUBLICAS = [
  '/login',
  '/registro',
  '/cambiar-password',
  '/nuestras-especialidades',
  '/nuestro-equipo',
];

/** La portada es la raiz exacta: con `startsWith` casaria con todas las rutas. */
function esRutaPublica(url: string): boolean {
  const sinParametros = url.split('?')[0];
  return sinParametros === '/' || RUTAS_PUBLICAS.some((r) => sinParametros.startsWith(r));
}

/**
 * Ancho a partir del cual el cajon de navegacion cabe junto al contenido.
 *
 * 56.25rem = 900 px: por debajo, las 15rem del cajon se comen la mitad util de
 * un movil, asi que pasa a superponerse y arranca cerrado.
 */
const ANCHO_ESCRITORIO = '(min-width: 56.25rem)';

// v4: el catalogo clinico ya no es una entrada para los cuatro roles. Sus tres
// pantallas son de mantenimiento y quedan en la consola de administracion; quien
// solo quiere consultarlo lo tiene en las paginas publicas, sin sesion siquiera.
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
    roles: ['ADMINISTRADOR'],
  },
  {
    ruta: '/tratamientos',
    etiqueta: 'Tratamientos',
    icono: 'healing',
    roles: ['ADMINISTRADOR'],
  },
  {
    ruta: '/odontologos',
    etiqueta: 'Odontologos',
    icono: 'groups',
    roles: ['ADMINISTRADOR'],
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
    ruta: '/pacientes',
    etiqueta: 'Pacientes',
    icono: 'groups_2',
    roles: ['RECEPCIONISTA', 'ADMINISTRADOR', 'ODONTOLOGO'],
  },
  {
    ruta: '/citas',
    etiqueta: 'Agenda',
    icono: 'event_note',
    roles: ['RECEPCIONISTA', 'ADMINISTRADOR'],
  },
  {
    ruta: '/citas/pendientes',
    etiqueta: 'Por cerrar',
    icono: 'fact_check',
    roles: ['ODONTOLOGO', 'RECEPCIONISTA', 'ADMINISTRADOR'],
  },
  {
    ruta: null,
    etiqueta: 'Citas',
    icono: 'event_note',
    roles: ['PACIENTE'],
    hijos: [
      { ruta: '/mis-citas', etiqueta: 'Mis citas' },
      { ruta: '/mis-citas/historial', etiqueta: 'Historial' },
    ],
  },
  {
    ruta: '/mis-tratamientos',
    etiqueta: 'Tratamientos',
    icono: 'healing',
    roles: ['PACIENTE'],
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
    () => this.estaAutenticado() && !esRutaPublica(this.url()),
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

    // Un grupo se abre solo cuando la pantalla actual es de uno de sus hijos, y
    // nunca se cierra solo: entrar directo al historial —por recarga o por un
    // enlace— con el grupo plegado dejaria el menu contradiciendo a la pantalla.
    effect(() => {
      const actual = this.url();
      const abrir = MENU.filter((entrada) =>
        entrada.hijos?.some((hijo) => actual === hijo.ruta || actual.startsWith(hijo.ruta + '/')),
      );
      if (abrir.length > 0) {
        this.gruposAbiertos.update((abiertos) => {
          const siguiente = new Set(abiertos);
          for (const entrada of abrir) {
            siguiente.add(entrada.etiqueta);
          }
          return siguiente;
        });
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

  /** Grupos desplegados, por etiqueta. Arrancan cerrados. */
  protected readonly gruposAbiertos = signal<ReadonlySet<string>>(new Set());

  protected estaAbierto(entrada: EntradaMenu): boolean {
    return this.gruposAbiertos().has(entrada.etiqueta);
  }

  protected alternarGrupo(entrada: EntradaMenu): void {
    this.gruposAbiertos.update((abiertos) => {
      const siguiente = new Set(abiertos);
      if (!siguiente.delete(entrada.etiqueta)) {
        siguiente.add(entrada.etiqueta);
      }
      return siguiente;
    });
  }

  /**
   * La cabecera del grupo se resalta cuando lo esta uno de sus hijos. No lo hace
   * `routerLinkActive` porque la cabecera es un boton, no un enlace, y plegado el
   * grupo no quedaria ni rastro de donde esta el usuario.
   */
  protected grupoActivo(entrada: EntradaMenu): boolean {
    const actual = this.url();
    return entrada.hijos?.some((hijo) => actual === hijo.ruta) ?? false;
  }

  protected cerrarSesion(): void {
    this.auth.logout();
  }
}
