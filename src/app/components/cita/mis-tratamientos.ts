import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { CitaResumen, Plan } from '../../models';
import { CitaService } from '../../services/cita.service';
import { PlanService } from '../../services/plan.service';
import { UsuarioService } from '../../services/usuario.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { agruparTratamientosRecibidos } from './agrupar-tratamientos-recibidos';

/**
 * Los tratamientos que el paciente ha recibido.
 *
 * <p>No es el catálogo de la clínica —eso vive en el área pública y, para
 * mantenerlo, en `/tratamientos`, que es de administración—: aquí solo está lo
 * que a esta persona le han hecho.
 *
 * <p><strong>Sale de sus citas atendidas.</strong> Una sesión es una cita atendida,
 * y la agrupación vive aparte, en `agrupar-tratamientos-recibidos`, para poder
 * probarla sin montar la pantalla.
 *
 * <p>Debajo van sus planes de tratamiento, con el avance que cuenta el servidor y
 * la fecha del próximo control que le indicaron por última vez. El detalle de cada
 * sesión —cuándo se atendió y qué cuidados seguir— está en la línea de tiempo del
 * plan, a la que lleva «Ver avance».
 *
 * <p>Las dos mitades salen de sitios distintos a propósito: los tratamientos
 * recibidos se deducen de las citas atendidas porque también hay tratamientos sin
 * plan, y el avance de un plan se lee del servidor porque es él quien lo cuenta.
 *
 * <p>No se anuncian especialidad ni duración: el resumen de la cita trae del
 * tratamiento solo su identificador y su nombre, y pedirlos al catálogo sería
 * cruzar dos fuentes para adornar una tarjeta.
 */
@Component({
  selector: 'app-mis-tratamientos',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="cabecera">
      <h1>Mis tratamientos</h1>
      <a mat-flat-button color="primary" routerLink="/disponibilidad">
        <mat-icon aria-hidden="true">event_available</mat-icon>
        Reservar una cita
      </a>
    </div>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando mis tratamientos" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (!cargando() && !error() && tratamientos().length === 0) {
      <p class="vacio">
        Todavía no has recibido ningún tratamiento. Aquí aparecerán cuando acudas a tu
        primera cita.
      </p>
    }

    @if (tratamientos().length > 0) {
      <ul class="lista">
        @for (tratamiento of tratamientos(); track tratamiento.tratamientoId) {
          <li>
            <mat-card>
              <mat-card-content>
                <h2>{{ tratamiento.nombre }}</h2>
                <p class="sesiones">
                  <mat-icon aria-hidden="true">check_circle</mat-icon>
                  {{ tratamiento.sesiones }}
                  {{ tratamiento.sesiones === 1 ? 'sesión' : 'sesiones' }}
                </p>
                <p class="cuando">
                  Última: {{ tratamiento.ultimaFecha | date: "d 'de' MMMM 'de' y" }}
                </p>
                <p class="quien">Con {{ tratamiento.ultimoOdontologo }}</p>
              </mat-card-content>
            </mat-card>
          </li>
        }
      </ul>
    }

    @if (errorPlanes(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (planes().length > 0) {
      <h2 class="titulo-planes">Mis planes de tratamiento</h2>
      <ul class="lista">
        @for (plan of planes(); track plan.id) {
          <li>
            <mat-card>
              <mat-card-content>
                <h3>{{ plan.tratamiento.nombre }}</h3>
                <p class="cuando">
                  {{ plan.sesionesPrevistas }}
                  {{ plan.sesionesPrevistas === 1 ? 'sesión prevista' : 'sesiones previstas' }}
                  · {{ plan.activo ? 'En curso' : 'Suspendido' }}
                </p>
                <p class="quien">Con {{ plan.odontologo.nombre }}</p>
                <p class="sesiones">
                  <mat-icon aria-hidden="true">check_circle</mat-icon>
                  {{ plan.avance.completadas }} de {{ plan.sesionesPrevistas }}
                  {{ plan.sesionesPrevistas === 1 ? 'sesión completada' : 'sesiones completadas' }}
                </p>
                <mat-progress-bar
                  mode="determinate"
                  [value]="porcentaje(plan)"
                  [attr.aria-label]="
                    'Avance de ' +
                    plan.tratamiento.nombre +
                    ': ' +
                    plan.avance.completadas +
                    ' de ' +
                    plan.sesionesPrevistas +
                    ' sesiones'
                  "
                />
                @if (ultimoControl(plan); as control) {
                  <p class="cuando control">
                    Próximo control: {{ control | date: "d 'de' MMMM 'de' y" }}
                  </p>
                }
              </mat-card-content>
              <mat-card-actions>
                <a
                  mat-button
                  [routerLink]="['/planes', plan.id]"
                  [attr.aria-label]="'Ver el avance de ' + plan.tratamiento.nombre"
                >
                  Ver avance
                </a>
              </mat-card-actions>
            </mat-card>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
      gap: 0.75rem;
    }
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.0625rem;
    }
    h3 {
      margin: 0 0 0.5rem;
      font-size: 1.0625rem;
    }
    .titulo-planes {
      margin: 1.5rem 0 0.75rem;
    }
    .control {
      margin-top: 0.5rem;
    }
    .sesiones {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.35rem;
      font-size: 0.9375rem;
    }
    .sesiones mat-icon {
      font-size: 1.125rem;
      width: 1.125rem;
      height: 1.125rem;
    }
    /* Color propio en vez de opacidad: al 70 % el contraste caia por debajo del
       4.5:1 que exige RNF-08. */
    .cuando,
    .quien {
      margin: 0 0 0.25rem;
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
    .vacio {
      padding: 1.5rem 0;
      max-width: 34rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
    }
  `,
})
export class MisTratamientos {
  private readonly servicio = inject(CitaService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly planService = inject(PlanService);

  protected readonly citas = signal<CitaResumen[]>([]);
  protected readonly planes = signal<Plan[]>([]);
  protected readonly errorPlanes = signal<string | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly tratamientos = computed(() => agruparTratamientosRecibidos(this.citas()));

  constructor() {
    this.cargar();
    this.cargarPlanes();
  }

  protected porcentaje(plan: Plan): number {
    return plan.sesionesPrevistas > 0
      ? (plan.avance.completadas * 100) / plan.sesionesPrevistas
      : 0;
  }

  /**
   * La fecha de volver que le dieron al cerrar la última sesión. Las anteriores ya
   * no le sirven: cada cierre sustituye la indicación del anterior.
   */
  protected ultimoControl(plan: Plan): string | null {
    const cerradas = plan.sesiones.filter((s) => s.proximoControl !== null);
    if (cerradas.length === 0) {
      return null;
    }
    return cerradas.reduce((a, b) => (b.numero > a.numero ? b : a)).proximoControl;
  }

  /**
   * Los planes se piden por ficha y el paciente no la lleva en el token, así que
   * sale de su propia cuenta. Un error aquí no vacía la pantalla: los tratamientos
   * recibidos salen de otra consulta y siguen siendo legibles.
   */
  private cargarPlanes(): void {
    this.usuarioService.obtenerPerfilPropio().subscribe({
      next: (usuario) => {
        if (!usuario.fichaId) {
          return;
        }
        this.planService.deFicha(usuario.fichaId).subscribe({
          next: (planes) => this.planes.set(planes),
          error: (err: unknown) => {
            this.planes.set([]);
            this.errorPlanes.set(mensajeDeError(err));
          },
        });
      },
      error: (err: unknown) => this.errorPlanes.set(mensajeDeError(err)),
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    // El filtro lo aplica el servidor para no traerse las canceladas ni las
    // futuras, y la agrupación lo repite por su cuenta: cada uno tiene que ser
    // correcto por separado.
    cargarTodasLasPaginas((pagina) =>
      this.servicio.mias({ estado: 'ATENDIDA' }, { page: pagina, size: 100 }),
    ).subscribe({
      next: (citas) => {
        this.citas.set(citas);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.citas.set([]);
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
