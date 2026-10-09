import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { mensajeDeError } from '../../../core/http/api-error';
import { CitaResumen, EstadoCita, PacienteDetalle, Plan } from '../../../models';
import { OdontologoService } from '../../../services/odontologo.service';
import { PacienteService } from '../../../services/paciente.service';
import { PlanService } from '../../../services/plan.service';
import { UsuarioService } from '../../../services/usuario.service';
import {
  etiquetaDeEstadoCita,
  iconoDeEstadoCita,
  tonoDeEstadoCita,
} from '../../../shared/estado-cita';
import { miOdontologo } from '../../../shared/mi-odontologo';
import { CerrarSesionDatos, CerrarSesionDialogo } from '../../plan/cerrar-sesion-dialogo';
import { PlanEdit, PlanEditDatos } from '../../plan/plan-edit';
import { SuspenderPlanDialogo, SuspenderPlanDatos } from '../../plan/suspender-plan-dialogo';

@Component({
  selector: 'app-paciente-ficha',
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando la ficha" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (ficha(); as p) {
      <header class="cabecera-ficha">
        <span class="iniciales" aria-hidden="true">{{ iniciales(p) }}</span>
        <div class="titulo">
          <h1>{{ p.apellidos }}, {{ p.nombres }}</h1>
          <p class="ayuda">
            <span>Historia clínica {{ p.numeroHistoria }}</span>
            <span>{{ p.tipoDocumento }} {{ p.documento }}</span>
            <span
              class="dc-estado cuenta"
              [class.dc-estado--ok]="p.tieneCuenta"
            >
              <mat-icon aria-hidden="true">{{ p.tieneCuenta ? 'check_circle' : 'person_off' }}</mat-icon>
              {{ p.tieneCuenta ? 'Con cuenta' : 'Sin cuenta' }}
            </span>
          </p>
        </div>
        @if (puedeReservar()) {
          <a mat-flat-button [routerLink]="['/disponibilidad']"
             [queryParams]="{ pacienteId: p.id }">
            <mat-icon>event_available</mat-icon>
            Reservar cita
          </a>
        }
      </header>

      <div class="columnas">
        <mat-card class="tarjeta">
          <mat-card-header><mat-card-title>Datos y alergias</mat-card-title></mat-card-header>
          <mat-card-content>
            @if (puedeEditar()) {
              <form [formGroup]="formulario" (ngSubmit)="guardar()">
                <div class="fila">
                  <mat-form-field appearance="outline">
                    <mat-label>Nombres</mat-label>
                    <input matInput formControlName="nombres" />
                    @if (formulario.controls.nombres.hasError('required')) {
                      <mat-error>Los nombres son obligatorios</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Apellidos</mat-label>
                    <input matInput formControlName="apellidos" />
                    @if (formulario.controls.apellidos.hasError('required')) {
                      <mat-error>Los apellidos son obligatorios</mat-error>
                    }
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline">
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="telefono" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Alergias</mat-label>
                  <textarea matInput rows="3" formControlName="alergias"></textarea>
                </mat-form-field>

                <div class="acciones">
                  <button
                    mat-flat-button
                    type="submit"
                    [disabled]="formulario.invalid || guardando()"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            } @else {
              <dl>
                <dt>Teléfono</dt>
                <dd>{{ p.telefono || '—' }}</dd>
                <dt>Alergias</dt>
                <dd>
                  @if (alergiasDe(p).length === 0) {
                    Sin alergias registradas
                  } @else {
                    <span class="alergias">
                      @for (alergia of alergiasDe(p); track alergia) {
                        <span class="alergia">
                          <mat-icon aria-hidden="true">warning</mat-icon>{{ alergia }}
                        </span>
                      }
                    </span>
                  }
                </dd>
              </dl>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="tarjeta">
          <mat-card-header><mat-card-title>Citas</mat-card-title></mat-card-header>
          <mat-card-content>
            <h2>Futuras</h2>
            @if (futuras().length === 0) {
              <p class="vacio">No tiene citas futuras.</p>
            } @else {
              <ul class="citas">
                @for (cita of futuras(); track cita.id) {
                  <li>
                    <strong>{{ cita.fecha | date: 'd MMM y' }} · {{ cita.hora.slice(0, 5) }}</strong>
                    <span>{{ cita.tratamiento.nombre }} — {{ cita.odontologo.nombre }}</span>
                    <span
                      class="dc-estado estado-cita"
                      [class.dc-estado--info]="tono(cita.estado) === 'info'"
                      [class.dc-estado--ok]="tono(cita.estado) === 'ok'"
                      [class.dc-estado--aviso]="tono(cita.estado) === 'aviso'"
                      [class.dc-estado--error]="tono(cita.estado) === 'error'"
                    >
                      <mat-icon aria-hidden="true">{{ icono(cita.estado) }}</mat-icon>
                      {{ etiqueta(cita.estado) }}
                    </span>
                  </li>
                }
              </ul>
            }

            <h2>Pasadas</h2>
            @if (pasadas().length === 0) {
              <p class="vacio">No tiene citas anteriores.</p>
            } @else {
              <ul class="citas">
                @for (cita of pasadas(); track cita.id) {
                  <li>
                    <strong>{{ cita.fecha | date: 'd MMM y' }} · {{ cita.hora.slice(0, 5) }}</strong>
                    <span>{{ cita.tratamiento.nombre }} — {{ cita.odontologo.nombre }}</span>
                    <span
                      class="dc-estado estado-cita"
                      [class.dc-estado--info]="tono(cita.estado) === 'info'"
                      [class.dc-estado--ok]="tono(cita.estado) === 'ok'"
                      [class.dc-estado--aviso]="tono(cita.estado) === 'aviso'"
                      [class.dc-estado--error]="tono(cita.estado) === 'error'"
                    >
                      <mat-icon aria-hidden="true">{{ icono(cita.estado) }}</mat-icon>
                      {{ etiqueta(cita.estado) }}
                    </span>
                  </li>
                }
              </ul>
            }
          </mat-card-content>
        </mat-card>

        @if (puedePlanificar()) {
          <mat-card class="tarjeta">
            <mat-card-header>
              <mat-card-title>Planes de tratamiento</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (errorPlanes(); as mensaje) {
                <p class="error" role="alert">{{ mensaje }}</p>
              }

              @if (planes().length === 0) {
                <p class="vacio">No tiene ningún plan de tratamiento.</p>
              } @else {
                <ul class="planes">
                  @for (plan of planes(); track plan.id) {
                    <li [class.suspendido]="!plan.activo">
                      <div class="plan-datos">
                        <strong>{{ plan.tratamiento.nombre }}</strong>
                        <span>
                          {{ plan.sesionesPrevistas }}
                          {{ plan.sesionesPrevistas === 1 ? 'sesión prevista' : 'sesiones previstas' }}
                          · {{ plan.odontologo.nombre }}
                        </span>
                        <span
                          class="dc-estado estado-plan"
                          [class.dc-estado--ok]="plan.activo"
                          [class.dc-estado--aviso]="!plan.activo"
                        >
                          <mat-icon aria-hidden="true">{{
                            plan.activo ? 'check_circle' : 'pause_circle'
                          }}</mat-icon>
                          {{ plan.activo ? 'Activo' : 'Suspendido' }}
                        </span>
                        @if (plan.motivoSuspension) {
                          <span class="estado">Motivo: {{ plan.motivoSuspension }}</span>
                        }
                        <span>
                          {{ plan.avance.completadas }} de {{ plan.sesionesPrevistas }}
                          {{ plan.sesionesPrevistas === 1 ? 'completada' : 'completadas' }} ·
                          <a
                            [routerLink]="['/planes', plan.id]"
                            [attr.aria-label]="'Ver el avance del plan de ' + plan.tratamiento.nombre"
                            >Ver avance</a
                          >
                        </span>
                        <span
                          class="barra"
                          role="progressbar"
                          aria-valuemin="0"
                          [attr.aria-valuemax]="plan.sesionesPrevistas"
                          [attr.aria-valuenow]="plan.avance.completadas"
                          [attr.aria-label]="
                            'Sesiones completadas: ' +
                            plan.avance.completadas +
                            ' de ' +
                            plan.sesionesPrevistas
                          "
                        >
                          <span
                            [style.width.%]="
                              plan.sesionesPrevistas
                                ? (100 * plan.avance.completadas) / plan.sesionesPrevistas
                                : 0
                            "
                          ></span>
                        </span>

                        <ol
                          class="sesiones"
                          [attr.aria-label]="'Sesiones del plan de ' + plan.tratamiento.nombre"
                        >
                          @for (sesion of plan.sesiones; track sesion.id) {
                            <li [class.ocupada]="sesion.cita">
                              <span class="numero">Sesión {{ sesion.numero }}</span>
                              <span>· {{ etiquetaSesion(sesion.estado) }}</span>
                              @if (sesion.cita; as cita) {
                                <span>· {{ cita.codigo }} · {{ cita.inicio | date: 'd MMM y' }}</span>
                              }

                              @if (sesion.estado === 'ATENDIDA' && puedeCerrar(plan)) {
                                <button
                                  mat-button
                                  type="button"
                                  class="cerrar"
                                  (click)="cerrarSesion(plan, sesion)"
                                  [attr.aria-label]="
                                    'Cerrar la sesión ' +
                                    sesion.numero +
                                    ' del plan de ' +
                                    plan.tratamiento.nombre
                                  "
                                >
                                  Cerrar sesión
                                </button>
                              }

                              @if (sesion.estado === 'CERRADA') {
                                <ul class="indicado">
                                  @for (cuidado of sesion.recomendaciones; track cuidado.id) {
                                    <li>{{ cuidado.descripcion }}</li>
                                  }
                                </ul>
                                <span class="control">
                                  Próximo control: {{ sesion.proximoControl | date: 'd MMM y' }}
                                </span>
                                @if (sesion.observacion) {
                                  <span class="control">{{ sesion.observacion }}</span>
                                }
                              }
                            </li>
                          }
                        </ol>
                      </div>

                      @if (plan.activo) {
                        <button
                          mat-stroked-button
                          type="button"
                          color="warn"
                          (click)="suspenderPlan(plan)"
                          [attr.aria-label]="'Suspender el plan de ' + plan.tratamiento.nombre"
                        >
                          Suspender
                        </button>
                      }
                    </li>
                  }
                </ul>
              }

              <div class="acciones">
                <button mat-flat-button type="button" (click)="nuevoPlan(p)">
                  <mat-icon>assignment_add</mat-icon>
                  Nuevo plan
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
  styles: `
    h1 {
      font: var(--text-display-sm);
      letter-spacing: -0.01em;
      margin: 0 0 var(--space-1);
    }
    h2 {
      font: var(--text-title-sm);
      margin: var(--space-5) 0 var(--space-2);
    }
    h2:first-child {
      margin-top: 0;
    }
    .ayuda {
      margin: 0 0 var(--space-4);
      color: var(--ink-muted);
      font: var(--text-code);
    }
    .acciones-ficha {
      margin: 0 0 var(--space-5);
    }
    .columnas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
      gap: var(--space-5);
      align-items: start;
    }
    .tarjeta {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: none;
    }
    .cabecera-ficha {
      display: flex;
      align-items: center;
      gap: var(--space-5);
      flex-wrap: wrap;
      margin-bottom: var(--space-6);
    }
    .titulo {
      flex: 1 1 18rem;
      min-width: 0;
    }
    .iniciales {
      width: 4rem;
      height: 4rem;
      flex: none;
      display: grid;
      place-items: center;
      border-radius: var(--radius-pill);
      background: var(--brand-soft);
      color: var(--on-brand-soft);
      font: 700 1.375rem/1 var(--font-display);
    }
    .ayuda {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-4);
    }
    .cuenta {
      font: var(--text-label);
    }
    .alergias {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .alergia {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      height: 2rem;
      padding: 0 var(--space-3);
      border: 1px solid var(--warning);
      border-radius: var(--radius-pill);
      color: var(--warning-ink);
      font: var(--text-label);
    }
    .alergia mat-icon {
      width: 1rem;
      height: 1rem;
      font-size: 1rem;
    }
    .estado-cita {
      align-self: flex-start;
      margin-top: var(--space-1);
    }
    .barra {
      display: block;
      height: 0.5rem;
      margin-top: var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--surface-sunken);
      overflow: hidden;
    }
    .barra > span {
      display: block;
      height: 100%;
      border-radius: var(--radius-pill);
      background: var(--brand);
    }
    .estado-plan {
      align-self: flex-start;
      margin: var(--space-1) 0;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .fila {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .fila mat-form-field {
      flex: 1 1 10rem;
    }
    .acciones {
      display: flex;
      justify-content: flex-end;
    }
    dl {
      margin: 0;
    }
    dt {
      font: var(--text-label);
      color: var(--ink-muted);
      margin-top: var(--space-3);
    }
    dd {
      margin: 0.25rem 0 0;
    }
    .citas {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .citas li {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border);
    }
    .citas strong {
      font: var(--text-time);
    }
    .estado,
    .vacio {
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .planes {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .planes > li {
      display: flex;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }
    .sesiones {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .sesiones li {
      display: flex;
      flex-wrap: wrap;
      column-gap: 0.25rem;
      font-size: 0.8125rem;
    }
    .sesiones li.ocupada .numero {
      font-weight: 600;
    }
    .indicado {
      flex-basis: 100%;
      margin: 0.25rem 0 0;
      padding-left: 1.1rem;
    }
    .control {
      flex-basis: 100%;
      color: var(--ink-muted);
    }
    .cerrar {
      margin-left: auto;
    }
    .plan-datos {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .plan-datos span {
      font-size: 0.875rem;
    }
    .suspendido strong {
      text-decoration: line-through;
    }

    @media (max-width: 30rem) {
      .cabecera-ficha > a {
        width: 100%;
      }
    }
    @media (max-width: 480px) {
      .planes > li {
        flex-direction: column;
        align-items: stretch;
      }
      .planes > li > button {
        width: 100%;
      }
    }
    .error {
      color: var(--danger-ink);
    }
  `,
})
export class PacienteFicha {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(PacienteService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly planService = inject(PlanService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly odontologoService = inject(OdontologoService);
  private readonly dialogo = inject(MatDialog);

  private readonly id = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly ficha = signal<PacienteDetalle | null>(null);
  protected readonly planes = signal<Plan[]>([]);
  protected readonly errorPlanes = signal<string | null>(null);

  private readonly miOdontologoId = signal<string | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    telefono: [''],
    alergias: [''],
  });

  protected readonly futuras = computed(() => this.reparto().futuras);
  protected readonly pasadas = computed(() => this.reparto().pasadas);

  protected iniciales(p: PacienteDetalle): string {
    const letra = (texto: string | null) => (texto ?? '').trim().charAt(0).toUpperCase();
    return letra(p.nombres) + letra(p.apellidos) || '?';
  }

  protected alergiasDe(p: PacienteDetalle): string[] {
    return (p.alergias ?? '')
      .split(/[,;\n]/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
  }

  protected etiqueta(estado: EstadoCita): string {
    return etiquetaDeEstadoCita(estado);
  }

  protected tono(estado: EstadoCita) {
    return tonoDeEstadoCita(estado);
  }

  protected icono(estado: EstadoCita): string {
    return iconoDeEstadoCita(estado);
  }

  protected puedeEditar(): boolean {
    const rol = this.auth.rol();
    return rol === 'RECEPCIONISTA' || rol === 'ADMINISTRADOR';
  }

  protected puedeReservar(): boolean {
    return this.puedeEditar();
  }

  protected etiquetaSesion(estado: Plan['sesiones'][number]['estado']): string {
    switch (estado) {
      case 'ATENDIDA':
        return 'Atendida';
      case 'CERRADA':
        return 'Cerrada';
      default:
        return 'Pendiente';
    }
  }

  protected puedePlanificar(): boolean {
    const rol = this.auth.rol();
    return rol === 'ODONTOLOGO' || rol === 'ADMINISTRADOR';
  }

  protected nuevoPlan(paciente: PacienteDetalle): void {
    const datos: PlanEditDatos = {
      pacienteId: paciente.id,
      pacienteNombre: `${paciente.apellidos ?? ''}, ${paciente.nombres ?? ''}`.trim(),
    };
    this.dialogo
      .open(PlanEdit, { data: datos })
      .afterClosed()
      .subscribe((plan: Plan | null | undefined) => {
        if (!plan) {
          return;
        }
        this.snackBar.open(
          `Plan de ${plan.tratamiento.nombre} creado con ${plan.sesionesPrevistas} sesiones.`,
          'Cerrar',
          { duration: 6000 },
        );
        this.cargarPlanes();
      });
  }

  protected puedeCerrar(plan: Plan): boolean {
    const rol = this.auth.rol();
    if (rol === 'ADMINISTRADOR') {
      return true;
    }
    return rol === 'ODONTOLOGO' && this.miOdontologoId() === plan.odontologo.id;
  }

  protected cerrarSesion(plan: Plan, sesion: Plan['sesiones'][number]): void {
    const datos: CerrarSesionDatos = { plan, sesion };
    this.dialogo
      .open(CerrarSesionDialogo, { data: datos })
      .afterClosed()
      .subscribe((actualizado: Plan | null | undefined) => {
        if (!actualizado) {
          return;
        }
        this.snackBar.open(
          `Sesión ${sesion.numero} cerrada. El paciente ya puede leer qué hacer hasta la siguiente.`,
          'Cerrar',
          { duration: 6000 },
        );
        this.cargarPlanes();
      });
  }

  protected suspenderPlan(plan: Plan): void {
    const datos: SuspenderPlanDatos = { plan };
    this.dialogo
      .open(SuspenderPlanDialogo, { data: datos })
      .afterClosed()
      .subscribe((suspendido: Plan | null | undefined) => {
        if (!suspendido) {
          return;
        }
        this.snackBar.open(
          `Plan suspendido. ${plan.tratamiento.nombre} vuelve a poder planificarse.`,
          'Cerrar',
          { duration: 6000 },
        );
        this.cargarPlanes();
      });
  }

  private cargarPlanes(): void {
    if (!this.puedePlanificar()) {
      return;
    }
    this.errorPlanes.set(null);
    this.planService.deFicha(this.id).subscribe({
      next: (planes) => this.planes.set(planes),
      error: (err: unknown) => {
        this.planes.set([]);
        this.errorPlanes.set(mensajeDeError(err));
      },
    });
  }

  constructor() {
    this.cargar();
    this.cargarPlanes();

    if (this.auth.rol() === 'ODONTOLOGO') {
      miOdontologo(this.usuarioService, this.odontologoService).subscribe((odontologo) =>
        this.miOdontologoId.set(odontologo?.id ?? null),
      );
    }
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();
    this.servicio
      .actualizar(this.id, {
        nombres: valores.nombres,
        apellidos: valores.apellidos,
        telefono: valores.telefono || undefined,
        alergias: valores.alergias || undefined,
      })
      .subscribe({
        next: (detalle) => {
          this.guardando.set(false);
          this.ficha.set(detalle);
          this.snackBar.open('Ficha actualizada.', 'Cerrar', { duration: 4000 });
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.obtener(this.id).subscribe({
      next: (detalle) => {
        this.cargando.set(false);
        this.ficha.set(detalle);
        this.formulario.patchValue({
          nombres: detalle.nombres ?? '',
          apellidos: detalle.apellidos ?? '',
          telefono: detalle.telefono ?? '',
          alergias: detalle.alergias ?? '',
        });
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  private reparto(): { futuras: CitaResumen[]; pasadas: CitaResumen[] } {
    const citas = this.ficha()?.citas ?? [];
    const ahora = new Date();
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(
      ahora.getDate(),
    ).padStart(2, '0')}`;
    const hora = ahora.toTimeString().slice(0, 8);

    const futuras: CitaResumen[] = [];
    const pasadas: CitaResumen[] = [];
    for (const cita of citas) {
      const esFutura = cita.fecha > hoy || (cita.fecha === hoy && cita.hora >= hora);
      (esFutura ? futuras : pasadas).push(cita);
    }
    return { futuras: futuras.slice().reverse(), pasadas };
  }
}
