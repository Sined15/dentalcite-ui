import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { Rol } from './models';

interface EntradaMenuHija {
  ruta: string;
  etiqueta: string;
}

interface EntradaMenu {
  ruta: string | null;
  etiqueta: string;
  icono: string;
  roles: readonly Rol[];
  hijos?: readonly EntradaMenuHija[];
  /** Rótulo de grupo al que pertenece, por rol: el odontólogo y el paciente tienen un menú plano. */
  grupos?: Partial<Record<Rol, string>>;
  /** La agenda vive en /citas y «Por cerrar» cuelga de ella: sin esto se marcarían las dos. */
  soloRutaExacta?: boolean;
}

interface EntradaConRotulo extends EntradaMenu {
  /** Solo la primera entrada de cada grupo lleva el rótulo. */
  rotulo: string | null;
}

const RUTA_Y_SUBRUTAS: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

const SOLO_RUTA_EXACTA: IsActiveMatchOptions = { ...RUTA_Y_SUBRUTAS, paths: 'exact' };

const RUTAS_PUBLICAS = [
  '/login',
  '/registro',
  '/cambiar-password',
  '/nuestras-especialidades',
  '/nuestro-equipo',
];

function esRutaPublica(url: string): boolean {
  const sinParametros = url.split('?')[0];
  return sinParametros === '/' || RUTAS_PUBLICAS.some((r) => sinParametros.startsWith(r));
}

const ANCHO_ESCRITORIO = '(min-width: 56.25rem)';

const ADMINISTRACION: Partial<Record<Rol, string>> = { ADMINISTRADOR: 'ADMINISTRACIÓN' };
const CITAS: Partial<Record<Rol, string>> = { RECEPCIONISTA: 'CITAS', ADMINISTRADOR: 'CITAS' };
const PACIENTES: Partial<Record<Rol, string>> = {
  RECEPCIONISTA: 'PACIENTES',
  ADMINISTRADOR: 'PACIENTES',
};
const CLINICA: Partial<Record<Rol, string>> = { RECEPCIONISTA: 'CLÍNICA', ADMINISTRADOR: 'CLÍNICA' };

// El orden es el del menú de cada rol, así que las entradas de un mismo grupo van juntas.
const MENU: readonly EntradaMenu[] = [
  {
    ruta: '/usuarios',
    etiqueta: 'Cuentas de acceso',
    icono: 'manage_accounts',
    roles: ['ADMINISTRADOR'],
    grupos: ADMINISTRACION,
  },
  {
    ruta: '/especialidades',
    etiqueta: 'Especialidades',
    icono: 'medical_services',
    roles: ['ADMINISTRADOR'],
    grupos: ADMINISTRACION,
  },
  {
    ruta: '/tratamientos',
    etiqueta: 'Tratamientos',
    icono: 'healing',
    roles: ['ADMINISTRADOR'],
    grupos: ADMINISTRACION,
  },
  {
    ruta: '/odontologos',
    etiqueta: 'Odontólogos',
    icono: 'groups',
    roles: ['ADMINISTRADOR'],
    grupos: ADMINISTRACION,
  },
  {
    ruta: '/citas',
    etiqueta: 'Agenda',
    icono: 'event_note',
    roles: ['RECEPCIONISTA', 'ADMINISTRADOR'],
    soloRutaExacta: true,
    grupos: CITAS,
  },
  {
    ruta: '/citas',
    etiqueta: 'Mi agenda',
    icono: 'event_note',
    roles: ['ODONTOLOGO'],
    soloRutaExacta: true,
  },
  {
    ruta: '/mis-horarios',
    etiqueta: 'Mis horarios',
    icono: 'schedule',
    roles: ['ODONTOLOGO'],
  },
  {
    ruta: '/citas/pendientes',
    etiqueta: 'Por cerrar',
    icono: 'fact_check',
    roles: ['ODONTOLOGO', 'RECEPCIONISTA', 'ADMINISTRADOR'],
    grupos: CITAS,
  },
  {
    ruta: '/disponibilidad',
    etiqueta: 'Disponibilidad',
    icono: 'event_available',
    roles: ['PACIENTE', 'RECEPCIONISTA', 'ADMINISTRADOR'],
    grupos: CITAS,
  },
  {
    ruta: '/seguimiento',
    etiqueta: 'Seguimiento de tratamientos',
    icono: 'insights',
    roles: ['ODONTOLOGO'],
  },
  {
    ruta: '/pacientes',
    etiqueta: 'Pacientes',
    icono: 'groups_2',
    roles: ['RECEPCIONISTA', 'ADMINISTRADOR', 'ODONTOLOGO'],
    grupos: PACIENTES,
  },
  {
    ruta: '/bloqueos',
    etiqueta: 'Bloqueos de agenda',
    icono: 'event_busy',
    roles: ['ODONTOLOGO', 'RECEPCIONISTA', 'ADMINISTRADOR'],
    grupos: CLINICA,
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

  /** Barra inferior del paciente en pantallas estrechas: los cuatro sitios a los que vuelve. */
  protected readonly pestanas = [
    { ruta: '/disponibilidad', etiqueta: 'Pedir cita', icono: 'event_available' },
    { ruta: '/mis-citas', etiqueta: 'Mis citas', icono: 'event_note' },
    { ruta: '/mis-tratamientos', etiqueta: 'Tratamientos', icono: 'healing' },
    { ruta: '/mis-citas/historial', etiqueta: 'Historial', icono: 'history' },
  ];

  protected readonly etiquetaDeRol = computed(() => {
    const etiquetas: Record<string, string> = {
      ADMINISTRADOR: 'Administración',
      RECEPCIONISTA: 'Recepción',
      ODONTOLOGO: 'Odontología',
      PACIENTE: 'Paciente',
    };
    const rol = this.rol();
    return rol ? (etiquetas[rol] ?? rol) : '';
  });

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly mostrarShell = computed(
    () => this.estaAutenticado() && !esRutaPublica(this.url()),
  );

  protected readonly esEscritorio = toSignal(
    this.puntosDeCorte.observe(ANCHO_ESCRITORIO).pipe(map((estado) => estado.matches)),
    { initialValue: this.puntosDeCorte.isMatched(ANCHO_ESCRITORIO) },
  );

  protected readonly modoCajon = computed(() => (this.esEscritorio() ? 'side' : 'over'));

  protected readonly cajonAbierto = signal(this.puntosDeCorte.isMatched(ANCHO_ESCRITORIO));

  constructor() {
    effect(() => {
      this.cajonAbierto.set(this.esEscritorio());
    });

    effect(() => {
      this.url();
      if (!this.esEscritorio()) {
        this.cajonAbierto.set(false);
      }
    });

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

  protected readonly entradas = computed<EntradaConRotulo[]>(() => {
    const rol = this.rol();
    if (!rol) {
      return [];
    }
    let anterior: string | undefined;
    return MENU.filter((e) => e.roles.includes(rol)).map((entrada) => {
      const grupo = entrada.grupos?.[rol];
      const rotulo = grupo && grupo !== anterior ? grupo : null;
      anterior = grupo;
      return { ...entrada, rotulo };
    });
  });

  protected opcionesDeActivo(entrada: EntradaMenu): IsActiveMatchOptions {
    return entrada.soloRutaExacta ? SOLO_RUTA_EXACTA : RUTA_Y_SUBRUTAS;
  }

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

  protected grupoActivo(entrada: EntradaMenu): boolean {
    const actual = this.url();
    return entrada.hijos?.some((hijo) => actual === hijo.ruta) ?? false;
  }

  protected cerrarSesion(): void {
    this.auth.logout();
  }
}
