import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import { EstadoSesion, Plan, sesionesPorCerrar } from '../../models';
import { PlanService } from '../../services/plan.service';

/** Cómo se lee cada estado de una sesión en la línea de tiempo: texto e icono, nunca solo color. */
const ESTADOS: Record<EstadoSesion, { texto: string; icono: string }> = {
  PENDIENTE: { texto: 'Pendiente', icono: 'radio_button_unchecked' },
  ATENDIDA: { texto: 'Atendida · pendiente de cierre', icono: 'pending_actions' },
  CERRADA: { texto: 'Completada', icono: 'check_circle' },
};

/**
 * El avance de un plan de tratamiento y la línea de tiempo de sus sesiones.
 *
 * <p>La abren el paciente —sus planes—, el odontólogo —los de sus pacientes— y
 * administración. Quién puede leer cuál lo decide el servidor con el plan en la
 * mano; aquí solo se traduce su 403 a algo que se entienda.
 *
 * <p>La cifra de avance se lee tal cual llega: la cuenta el servidor sobre las
 * citas atendidas, y contarla también aquí sería tener la misma cifra con dos
 * fórmulas. La barra acompaña al texto, no lo sustituye: quien no la ve tiene la
 * frase, y el lector de pantalla la anuncia con su propia etiqueta.
 */
@Component({
  selector: 'app-plan-avance',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <a mat-button [routerLink]="volver().ruta" class="volver">
      <mat-icon aria-hidden="true">arrow_back</mat-icon>
      {{ volver().etiqueta }}
    </a>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando el plan de tratamiento" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (plan(); as p) {
      <header class="cabecera">
        <h1>{{ p.tratamiento.nombre }}</h1>
        <p class="dato">
          @if (!esPaciente()) {
            {{ p.paciente.nombre }} ·
          }
          Con {{ p.odontologo.nombre }} ·
          <span class="estado-plan">
            <mat-icon aria-hidden="true">{{ p.activo ? 'play_circle' : 'pause_circle' }}</mat-icon>
            {{ p.activo ? 'En curso' : 'Suspendido' }}
          </span>
        </p>
        @if (p.motivoSuspension) {
          <p class="dato">Motivo de la suspensión: {{ p.motivoSuspension }}</p>
        }
      </header>

      <section class="avance" aria-labelledby="titulo-avance">
        <h2 id="titulo-avance">Avance</h2>
        <p class="cifra">
          <strong>{{ p.avance.completadas }} de {{ p.sesionesPrevistas }}</strong>
          {{ p.sesionesPrevistas === 1 ? 'sesión completada' : 'sesiones completadas' }}
          · {{ p.avance.pendientes }}
          {{ p.avance.pendientes === 1 ? 'pendiente' : 'pendientes' }}
        </p>
        <mat-progress-bar
          mode="determinate"
          [value]="porcentaje()"
          [attr.aria-label]="
            'Avance del plan: ' + p.avance.completadas + ' de ' + p.sesionesPrevistas + ' sesiones'
          "
        />
        @if (porCerrar() > 0) {
          <p class="aviso">
            <mat-icon aria-hidden="true">pending_actions</mat-icon>
            {{
              porCerrar() === 1
                ? 'Una sesión atendida está pendiente de cierre.'
                : porCerrar() + ' sesiones atendidas están pendientes de cierre.'
            }}
          </p>
        }
      </section>

      <section aria-labelledby="titulo-linea">
        <h2 id="titulo-linea">Línea de tiempo</h2>
        <ol class="linea">
          @for (sesion of p.sesiones; track sesion.id) {
            <li [class]="'sesion ' + sesion.estado.toLowerCase()">
              <div class="marca" aria-hidden="true">
                <mat-icon>{{ estados[sesion.estado].icono }}</mat-icon>
              </div>
              <div class="contenido">
                <h3>Sesión {{ sesion.numero }}</h3>
                <p class="estado">{{ estados[sesion.estado].texto }}</p>

                @if (sesion.cita; as cita) {
                  <p class="dato">
                    Atendida el {{ cita.inicio | date: "d 'de' MMMM 'de' y" }}
                  </p>
                }

                @if (sesion.recomendaciones.length > 0) {
                  <p class="subtitulo">Recomendaciones</p>
                  <ul class="indicado">
                    @for (cuidado of sesion.recomendaciones; track cuidado.id) {
                      <li>{{ cuidado.descripcion }}</li>
                    }
                  </ul>
                }
                @if (sesion.observacion; as nota) {
                  <p class="dato">Observación: {{ nota }}</p>
                }
                @if (sesion.proximoControl; as control) {
                  <p class="dato">
                    Próximo control: {{ control | date: "d 'de' MMMM 'de' y" }}
                  </p>
                }
              </div>
            </li>
          }
        </ol>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 44rem;
    }
    .volver {
      margin: 0 0 0.5rem -0.75rem;
    }
    h1 {
      margin: 0 0 0.25rem;
    }
    h2 {
      margin: 1.5rem 0 0.5rem;
      font-size: 1.125rem;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
    }
    /* Color propio en vez de opacidad, para no bajar del 4.5:1 de contraste. */
    .dato,
    .estado {
      margin: 0.15rem 0;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
      overflow-wrap: anywhere;
    }
    .estado-plan,
    .aviso {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .estado-plan mat-icon,
    .aviso mat-icon {
      font-size: 1.125rem;
      width: 1.125rem;
      height: 1.125rem;
    }
    .cifra {
      margin: 0 0 0.5rem;
      font-size: 1rem;
    }
    .aviso {
      margin: 0.75rem 0 0;
      font-size: 0.875rem;
    }
    .subtitulo {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .indicado {
      margin: 0.25rem 0;
      padding-left: 1.1rem;
      font-size: 0.875rem;
    }
    .linea {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .sesion {
      display: grid;
      grid-template-columns: 2rem 1fr;
      gap: 0.75rem;
      padding-bottom: 1rem;
      position: relative;
    }
    /* El hilo que une las sesiones, detrás de sus marcas. */
    .sesion:not(:last-child)::before {
      content: '';
      position: absolute;
      left: calc(1rem - 1px);
      top: 2rem;
      bottom: 0;
      width: 2px;
      background: var(--mat-sys-outline-variant, #c4c6d0);
    }
    .marca mat-icon {
      width: 2rem;
      height: 2rem;
      font-size: 2rem;
      color: var(--mat-sys-outline, #74777f);
    }
    .cerrada .marca mat-icon {
      color: var(--mat-sys-primary, #005cbb);
    }
    .atendida .marca mat-icon,
    .atendida .estado {
      color: var(--mat-sys-tertiary, #6b5778);
    }
    .atendida .estado {
      font-weight: 600;
    }
    .contenido {
      min-width: 0;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class PlanAvance {
  private readonly servicio = inject(PlanService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly estados = ESTADOS;
  protected readonly plan = signal<Plan | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly esPaciente = computed(() => this.auth.rol() === 'PACIENTE');

  protected readonly porcentaje = computed(() => {
    const p = this.plan();
    return p && p.sesionesPrevistas > 0 ? (p.avance.completadas * 100) / p.sesionesPrevistas : 0;
  });

  protected readonly porCerrar = computed(() => {
    const p = this.plan();
    return p ? sesionesPorCerrar(p) : 0;
  });

  /**
   * Adónde se vuelve depende de por dónde se llegó, y eso lo dice el rol: el
   * paciente viene de sus tratamientos, el odontólogo de su seguimiento y
   * administración de la ficha del paciente, que es donde ve los planes.
   */
  protected readonly volver = computed(() => {
    switch (this.auth.rol()) {
      case 'PACIENTE':
        return { ruta: '/mis-tratamientos', etiqueta: 'Mis tratamientos' };
      case 'ODONTOLOGO':
        return { ruta: '/seguimiento', etiqueta: 'Seguimiento de tratamientos' };
      default: {
        const p = this.plan();
        return p
          ? { ruta: `/pacientes/${p.paciente.id}`, etiqueta: 'Ficha del paciente' }
          : { ruta: '/pacientes', etiqueta: 'Pacientes' };
      }
    }
  });

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    const id = this.ruta.snapshot.paramMap.get('id') ?? '';
    this.cargando.set(true);
    this.servicio.obtener(id).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(this.mensaje(err));
        this.cargando.set(false);
      },
    });
  }

  /**
   * El 403 de este recurso cubre también el plan que no existe, así que el
   * mensaje no puede afirmar que es de otra persona.
   */
  private mensaje(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 403) {
      return 'No puedes consultar este plan de tratamiento.';
    }
    if (err instanceof HttpErrorResponse && err.status === 404) {
      return 'Este plan de tratamiento no existe.';
    }
    return mensajeDeError(err);
  }
}
