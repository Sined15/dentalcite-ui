import { UpperCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { Plan, sesionesPorCerrar } from '../../models';
import { OdontologoService } from '../../services/odontologo.service';
import { PlanService } from '../../services/plan.service';
import { PublicoService } from '../../services/publico.service';
import { UsuarioService } from '../../services/usuario.service';
import { especialidadPorTratamiento } from '../../shared/especialidad-de-tratamiento';
import { visualDeEspecialidad } from '../../shared/especialidad-visual';
import { miOdontologo } from '../../shared/mi-odontologo';
import { SuspenderPlanDatos, SuspenderPlanDialogo } from './suspender-plan-dialogo';

@Component({
  selector: 'app-seguimiento-planes',
  imports: [
    RouterLink,
    UpperCasePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="cabecera">
      <div class="dc-titular">
        <h1>Seguimiento de tratamientos</h1>
        <p class="dc-subtitulo">
          Los planes que has firmado y los de los pacientes que tienen alguna cita contigo. Los
          que siguen en curso, primero.
        </p>
      </div>
    </div>

    <nav class="pestanas" aria-label="Estado del plan">
      <button
        type="button"
        [class.activa]="soloActivos()"
        [attr.aria-current]="soloActivos() ? 'true' : null"
        (click)="alternarSuspendidos(false)"
      >
        Activos
      </button>
      <button
        type="button"
        [class.activa]="!soloActivos()"
        [attr.aria-current]="!soloActivos() ? 'true' : null"
        (click)="alternarSuspendidos(true)"
      >
        Todos, con los suspendidos
      </button>
    </nav>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando los planes de tus pacientes" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (!cargando() && !error() && planes().length === 0) {
      <p class="dc-vacio">
        <mat-icon aria-hidden="true">assignment</mat-icon>
        <span>Ninguno de tus pacientes tiene un plan de tratamiento.</span>
      </p>
    }

    @if (planes().length > 0) {
      <ul class="lista">
        @for (plan of planes(); track plan.id) {
          <li>
            <mat-card
              appearance="outlined"
              [class.suspendido]="!plan.activo"
              [attr.data-spec]="visual(plan).clave"
            >
              <mat-card-content>
                <div class="encabezado">
                  <span class="dc-spec-tile" aria-hidden="true">
                    <mat-icon>{{ visual(plan).icono }}</mat-icon>
                  </span>
                  <div class="titulo">
                    @if (especialidadDe(plan); as especialidad) {
                      <p class="rotulo">{{ especialidad | uppercase }}</p>
                    }
                    <h2>{{ plan.tratamiento.nombre }}</h2>
                    <p class="paciente">
                      <a [routerLink]="['/pacientes', plan.paciente.id]">{{
                        plan.paciente.nombre
                      }}</a>
                    </p>
                  </div>
                </div>

                <div class="progreso">
                  <p class="cifra">
                    <strong>{{ plan.avance.completadas }} de {{ plan.sesionesPrevistas }}</strong>
                    {{ plan.sesionesPrevistas === 1 ? 'sesión completada' : 'sesiones completadas' }}
                    @if (porCerrar(plan) > 0) {
                      <span class="aviso">
                        <mat-icon aria-hidden="true">pending_actions</mat-icon>
                        {{ porCerrar(plan) }} por cerrar
                      </span>
                    }
                  </p>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="porcentaje(plan)"
                    [attr.aria-label]="
                      'Avance de ' + plan.tratamiento.nombre + ': ' + plan.avance.completadas + ' de ' + plan.sesionesPrevistas + ' sesiones'
                    "
                  />
                </div>

                <p class="etiquetas">
                  <span
                    class="dc-estado"
                    [class.dc-estado--ok]="plan.activo"
                    [class.dc-estado--aviso]="!plan.activo"
                  >
                    <mat-icon aria-hidden="true">{{
                      plan.activo ? 'check_circle' : 'pause_circle'
                    }}</mat-icon>
                    {{ plan.activo ? 'En curso' : 'Suspendido' }}
                  </span>
                  <span class="dc-estado" [class.dc-estado--info]="plan.odontologo.id === miId()">
                    @if (plan.odontologo.id === miId()) {
                      <mat-icon aria-hidden="true">edit</mat-icon>
                      <strong>Tuyo</strong>
                    } @else {
                      <mat-icon aria-hidden="true">person</mat-icon>
                      Firmado por {{ plan.odontologo.nombre }}
                    }
                  </span>
                </p>
              </mat-card-content>
              <mat-card-actions>
                <a
                  mat-stroked-button
                  class="dc-accion"
                  [routerLink]="['/planes', plan.id]"
                  [attr.aria-label]="
                    'Ver el avance de ' + plan.tratamiento.nombre + ' de ' + plan.paciente.nombre
                  "
                >
                  Ver avance
                  <mat-icon iconPositionEnd>chevron_right</mat-icon>
                </a>
                @if (plan.activo && plan.odontologo.id === miId()) {
                  <button
                    mat-stroked-button
                    class="dc-accion dc-accion--peligro"
                    type="button"
                    (click)="suspender(plan)"
                    [attr.aria-label]="'Suspender el plan de ' + plan.tratamiento.nombre"
                  >
                    <mat-icon>pause_circle</mat-icon>
                    Suspender
                  </button>
                }
              </mat-card-actions>
            </mat-card>
          </li>
        }
      </ul>
    }

    <mat-paginator
      [length]="total()"
      [pageSize]="tamano()"
      [pageIndex]="indice()"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="cambiarPagina($event)"
      aria-label="Paginación de los planes de tus pacientes"
    />
  `,
  styles: `
    .cabecera {
      margin-bottom: var(--space-4);
    }
    .pestanas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-6);
      border-bottom: 1px solid var(--border);
    }
    .pestanas button {
      min-height: 2.75rem;
      padding: var(--space-3) var(--space-4);
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      background: none;
      color: var(--ink-muted);
      font: 500 0.875rem/1 var(--font-sans);
      cursor: pointer;
    }
    .pestanas button:hover {
      color: var(--ink);
    }
    .pestanas button.activa {
      color: var(--ink);
      border-bottom-color: var(--brand);
    }
    .lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(21rem, 1fr));
      gap: var(--space-6);
    }
    mat-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    mat-card:hover {
      box-shadow: var(--shadow-sm);
      border-color: var(--border-strong);
    }
    mat-card-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-top: var(--space-5);
    }
    .encabezado {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
    }
    .titulo {
      min-width: 0;
    }
    .rotulo {
      margin: 0;
      font: var(--text-overline);
      letter-spacing: 0.08em;
      color: var(--spec, var(--ink-muted));
    }
    h2 {
      margin: 0;
      font: var(--text-title-sm);
    }
    .paciente {
      margin: 2px 0 0;
      overflow-wrap: anywhere;
    }
    .cifra {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-1) var(--space-2);
      margin: 0 0 var(--space-2);
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .cifra strong {
      font: 700 1rem/1 var(--font-display);
      color: var(--ink);
    }
    .aviso {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-left: auto;
      color: var(--warning-ink);
      font-weight: 600;
    }
    .aviso mat-icon {
      font-size: 1.125rem;
      width: 1.125rem;
      height: 1.125rem;
    }
    mat-progress-bar {
      --mat-progress-bar-track-height: 8px;
      --mat-progress-bar-active-indicator-height: 8px;
      --mat-progress-bar-track-shape: 999px;
      --mat-progress-bar-active-indicator-color: var(--brand);
      --mat-progress-bar-track-color: var(--surface-sunken);
      border-radius: var(--radius-pill);
    }
    .etiquetas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0;
    }
    mat-card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      padding: 0 var(--space-4) var(--space-4);
    }
    .suspendido {
      border: 1px dashed var(--border-strong);
    }
    .error {
      color: var(--danger-ink);
    }
  `,
})
export class SeguimientoPlanes {
  private readonly servicio = inject(PlanService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly planes = signal<Plan[]>([]);
  protected readonly total = signal(0);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly soloActivos = signal(true);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly miId = signal<string | null>(null);

  private readonly especialidades = signal<ReadonlyMap<string, string>>(new Map());

  protected readonly porCerrar = sesionesPorCerrar;

  protected porcentaje(plan: Plan): number {
    return plan.sesionesPrevistas > 0 ? (plan.avance.completadas * 100) / plan.sesionesPrevistas : 0;
  }

  protected especialidadDe(plan: Plan): string | null {
    return this.especialidades().get(plan.tratamiento.id) ?? null;
  }

  protected visual(plan: Plan) {
    return visualDeEspecialidad(this.especialidadDe(plan));
  }

  constructor() {
    miOdontologo(inject(UsuarioService), inject(OdontologoService)).subscribe((yo) =>
      this.miId.set(yo?.id ?? null),
    );
    especialidadPorTratamiento(inject(PublicoService)).subscribe((mapa) =>
      this.especialidades.set(mapa),
    );
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.servicio
      .seguimiento(this.soloActivos(), { page: this.indice(), size: this.tamano() })
      .subscribe({
        next: (pagina) => {
          this.planes.set(pagina.content);
          this.total.set(pagina.totalElements);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.planes.set([]);
          this.total.set(0);
          this.error.set(mensajeDeError(err));
          this.cargando.set(false);
        },
      });
  }

  protected alternarSuspendidos(incluir: boolean): void {
    if (this.soloActivos() === !incluir) {
      return;
    }
    this.soloActivos.set(!incluir);
    this.indice.set(0);
    this.cargar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.indice.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  protected suspender(plan: Plan): void {
    const datos: SuspenderPlanDatos = { plan };
    this.dialogo
      .open(SuspenderPlanDialogo, { data: datos })
      .afterClosed()
      .subscribe((suspendido: Plan | null | undefined) => {
        if (!suspendido) {
          return;
        }
        this.snackBar.open('Plan suspendido.', 'Cerrar', { duration: 4000 });
        this.cargar();
      });
  }
}
