import { DatePipe, UpperCasePipe } from '@angular/common';
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
import { PublicoService } from '../../services/publico.service';
import { especialidadPorTratamiento } from '../../shared/especialidad-de-tratamiento';
import { visualDeEspecialidad } from '../../shared/especialidad-visual';

const ESTADOS: Record<EstadoSesion, { texto: string; icono: string }> = {
  PENDIENTE: { texto: 'Pendiente', icono: 'radio_button_unchecked' },
  ATENDIDA: { texto: 'Atendida · pendiente de cierre', icono: 'pending_actions' },
  CERRADA: { texto: 'Completada', icono: 'check_circle' },
};

@Component({
  selector: 'app-plan-avance',
  imports: [DatePipe, UpperCasePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
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
      <header class="encabezado" [attr.data-spec]="visual().clave">
        <span class="dc-spec-tile grande" aria-hidden="true">
          <mat-icon>{{ visual().icono }}</mat-icon>
        </span>
        <div class="texto">
          @if (especialidad(); as nombre) {
            <p class="rotulo">{{ nombre | uppercase }}</p>
          }
          <h1>{{ p.tratamiento.nombre }}</h1>
          <p class="dato">
            @if (!esPaciente()) {
              {{ p.paciente.nombre }} ·
            }
            Con {{ p.odontologo.nombre }} ·
            {{ p.sesionesPrevistas }}
            {{ p.sesionesPrevistas === 1 ? 'sesión' : 'sesiones' }} ·
            <span class="estado-plan">
              <mat-icon aria-hidden="true">{{ p.activo ? 'play_circle' : 'pause_circle' }}</mat-icon>
              {{ p.activo ? 'En curso' : 'Suspendido' }}
            </span>
          </p>
          @if (p.motivoSuspension) {
            <p class="dato">Motivo de la suspensión: {{ p.motivoSuspension }}</p>
          }
        </div>
        @if (esPaciente() && p.activo) {
          <a mat-flat-button routerLink="/disponibilidad">
            <mat-icon>event_available</mat-icon>
            Pedir cita
          </a>
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
                @if (esPaciente() && sesion.estado === 'ATENDIDA') {
                  <p class="dato">
                    Tu odontólogo aún no ha registrado las recomendaciones de esta sesión.
                    Aparecerán aquí cuando la cierre.
                  </p>
                }
                @if (esPaciente() && sesion.estado === 'PENDIENTE') {
                  <p class="dato">
                    Aún no tiene cita. Pide una desde «Pedir cita» y se enlazará sola cuando la
                    atiendan.
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
      max-width: 60rem;
    }
    .volver {
      margin: 0 0 0.5rem -0.75rem;
    }
    .encabezado {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: var(--space-5);
      margin: var(--space-4) 0 var(--space-6);
    }
    .encabezado .texto {
      flex: 1 1 20rem;
      min-width: 0;
    }
    .dc-spec-tile.grande {
      width: 3.5rem;
      height: 3.5rem;
    }
    .rotulo {
      margin: 0 0 var(--space-1);
      font: var(--text-overline);
      letter-spacing: 0.08em;
      color: var(--spec, var(--ink-muted));
    }
    h1 {
      margin: 0 0 var(--space-1);
      font: var(--text-display-sm);
      letter-spacing: -0.01em;
    }
    h2 {
      margin: var(--space-6) 0 var(--space-3);
      font: var(--text-title-lg);
    }
    h3 {
      margin: 0;
      font: var(--text-title-sm);
    }
    .avance {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-5) var(--space-6);
    }
    .avance h2 {
      margin-top: 0;
    }
    .avance mat-progress-bar {
      --mat-progress-bar-track-height: 10px;
      --mat-progress-bar-active-indicator-height: 10px;
      --mat-progress-bar-track-shape: 999px;
      --mat-progress-bar-active-indicator-color: var(--brand);
      --mat-progress-bar-track-color: var(--surface-sunken);
      border-radius: var(--radius-pill);
    }
    .dato,
    .estado {
      margin: 0.15rem 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
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
      margin: 0 0 var(--space-3);
      font: var(--text-body);
    }
    .cifra strong {
      font: 700 1.375rem/1 var(--font-display);
    }
    .aviso {
      margin: var(--space-3) 0 0;
      font: var(--text-body-sm);
      color: var(--warning-ink);
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
      grid-template-columns: 2.5rem minmax(0, 1fr);
      gap: var(--space-4);
      position: relative;
    }
    .sesion:not(:last-child)::before {
      content: '';
      position: absolute;
      left: calc(1.25rem - 1px);
      top: 2.75rem;
      bottom: 0;
      width: 2px;
      background: var(--border);
    }
    .marca {
      width: 2.5rem;
      height: 2.5rem;
      display: grid;
      place-items: center;
      border-radius: var(--radius-pill);
      border: 2px solid var(--border-strong);
      background: var(--surface);
      color: var(--ink-muted);
    }
    .marca mat-icon {
      width: 1.25rem;
      height: 1.25rem;
      font-size: 1.25rem;
    }
    .cerrada .marca {
      background: var(--success);
      border-color: var(--success);
      color: var(--on-success);
    }
    .atendida .marca {
      border-color: var(--warning);
      color: var(--warning-ink);
    }
    .atendida .estado {
      color: var(--warning-ink);
      font-weight: 600;
    }
    .cerrada .estado {
      color: var(--success-ink);
      font-weight: 600;
    }
    .contenido {
      min-width: 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-4) var(--space-5);
      margin-bottom: var(--space-4);
    }
    .error {
      color: var(--danger-ink);
    }
    @media (max-width: 45rem) {
      .avance {
        padding: var(--space-5);
      }
      .sesion {
        grid-template-columns: 2rem minmax(0, 1fr);
        gap: var(--space-3);
      }
      .marca {
        width: 2rem;
        height: 2rem;
      }
      .sesion:not(:last-child)::before {
        left: calc(1rem - 1px);
        top: 2.25rem;
      }
      .contenido {
        padding: var(--space-4);
      }
    }
  `,
})
export class PlanAvance {
  private readonly servicio = inject(PlanService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly publico = inject(PublicoService);

  private readonly especialidades = signal<ReadonlyMap<string, string>>(new Map());

  protected readonly estados = ESTADOS;
  protected readonly plan = signal<Plan | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly esPaciente = computed(() => this.auth.rol() === 'PACIENTE');

  // De la especialidad del tratamiento salen el color y el icono de la cabecera.
  protected readonly especialidad = computed(() => {
    const p = this.plan();
    return p ? (this.especialidades().get(p.tratamiento.id) ?? null) : null;
  });

  protected readonly visual = computed(() => visualDeEspecialidad(this.especialidad()));

  protected readonly porcentaje = computed(() => {
    const p = this.plan();
    return p && p.sesionesPrevistas > 0 ? (p.avance.completadas * 100) / p.sesionesPrevistas : 0;
  });

  protected readonly porCerrar = computed(() => {
    const p = this.plan();
    return p ? sesionesPorCerrar(p) : 0;
  });

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
    especialidadPorTratamiento(this.publico).subscribe((mapa) => this.especialidades.set(mapa));
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
