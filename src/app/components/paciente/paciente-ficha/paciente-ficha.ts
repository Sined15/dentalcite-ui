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
import { CitaResumen, PacienteDetalle, Plan } from '../../../models';
import { OdontologoService } from '../../../services/odontologo.service';
import { PacienteService } from '../../../services/paciente.service';
import { PlanService } from '../../../services/plan.service';
import { UsuarioService } from '../../../services/usuario.service';
import { miOdontologo } from '../../../shared/mi-odontologo';
import { CerrarSesionDatos, CerrarSesionDialogo } from '../../plan/cerrar-sesion-dialogo';
import { PlanEdit, PlanEditDatos } from '../../plan/plan-edit';
import { SuspenderPlanDialogo, SuspenderPlanDatos } from '../../plan/suspender-plan-dialogo';

/**
 * HU-13 · RF-08: «la ficha con datos, alergias y citas pasadas y futuras, y
 * editar los datos de contacto».
 *
 * Desde HU-17 muestra además los planes de tratamiento del paciente (RF-23), que
 * es donde el odontólogo decide planificar: aquí ya tiene delante sus alergias y
 * su historial de citas.
 *
 * El formulario de edición solo se pinta para RECEPCIONISTA y ADMINISTRADOR,
 * que son quienes RF-08 autoriza. Ocultarlo no es la defensa —esa es el 403 del
 * servidor, que se comprueba en su prueba de integración— sino no ofrecer al
 * odontólogo un botón que va a fallar.
 */
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
      <h1>{{ p.apellidos }}, {{ p.nombres }}</h1>
      <p class="ayuda">
        Historia clínica {{ p.numeroHistoria }} · {{ p.tipoDocumento }} {{ p.documento }}
      </p>

      <!--
        HU-14 · RF-17: es el camino natural para atender a quien llama o se
        acerca al mostrador —se le busca, se abre su ficha y se reserva—, y lleva
        al paciente ya elegido. Solo para quien puede ejercerlo: al odontologo y
        al propio paciente el servidor les devolveria 403.
      -->
      @if (puedeReservar()) {
        <p class="acciones-ficha">
          <a mat-flat-button color="primary" [routerLink]="['/disponibilidad']"
             [queryParams]="{ pacienteId: p.id }">
            <mat-icon>event_available</mat-icon>
            Reservar cita
          </a>
        </p>
      }

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
                    color="primary"
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
                <dd>{{ p.alergias || 'Sin alergias registradas' }}</dd>
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
                    <span class="estado">{{ cita.estado }}</span>
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
                    <span class="estado">{{ cita.estado }}</span>
                  </li>
                }
              </ul>
            }
          </mat-card-content>
        </mat-card>

        <!--
          HU-17 · RF-23. Solo la ven quienes pueden planificar: al paciente y a
          recepcion el servidor les responde 403, asi que pintarles una seccion
          vacia seria prometer algo que no pueden abrir.
        -->
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
                        <span class="estado">
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

                        <!--
                          El estado va escrito y no solo insinuado con estilo: quien
                          no distingue el realce tiene que poder leer igual qué
                          sesiones están hechas y con qué cita.
                        -->
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

                              <!--
                                Cerrar es del administrador y del odontologo que
                                firmo el plan: a otro el servidor le responde 403,
                                asi que no se le ofrece el boton.
                              -->
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
                <button mat-flat-button color="primary" type="button" (click)="nuevoPlan(p)">
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
      font-size: 1.5rem;
      margin: 0 0 0.25rem;
    }
    h2 {
      font-size: 1rem;
      margin: 1rem 0 0.5rem;
    }
    .ayuda {
      margin: 0 0 0.75rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
    }
    .acciones-ficha {
      margin: 0 0 1rem;
    }
    .columnas {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: flex-start;
    }
    .tarjeta {
      flex: 1 1 24rem;
      min-width: 0;
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
      font-weight: 600;
      margin-top: 0.75rem;
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
      border-bottom: 1px solid var(--mat-sys-outline-variant, #cac4d0);
    }
    .estado,
    .vacio {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
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
      border-bottom: 1px solid var(--mat-sys-outline-variant, #cac4d0);
    }
    .sesiones {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    /* Cada fragmento baja entero a la línea siguiente a 360 px, sin partirse. */
    .sesiones li {
      display: flex;
      flex-wrap: wrap;
      column-gap: 0.25rem;
      font-size: 0.8125rem;
    }
    .sesiones li.ocupada .numero {
      font-weight: 600;
    }
    /* Lo indicado al cerrar ocupa su propia linea: son varias frases y leerlas
       encadenadas con el resto de la sesion las vuelve ilegibles. */
    .indicado {
      flex-basis: 100%;
      margin: 0.25rem 0 0;
      padding-left: 1.1rem;
    }
    .control {
      flex-basis: 100%;
      color: var(--mat-sys-on-surface-variant, #49454f);
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

    /* RNF-09: a 360px el boton baja bajo los datos en vez de estrujarlos. */
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
      color: var(--mat-sys-error, #b3261e);
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

  /**
   * Mi registro de odontólogo, para saber qué planes firmé yo. Nulo mientras se
   * resuelve y para quien no es odontólogo: en ese caso no se ofrece cerrar, que
   * es lo prudente cuando aún no se sabe.
   */
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

  /**
   * Pasadas y futuras se separan aquí y no en el servidor: allí habría que fijar
   * qué es «ahora» para toda la clínica, y el cliente ya tiene la fecha y la
   * hora locales de cada cita.
   */
  protected readonly futuras = computed(() => this.reparto().futuras);
  protected readonly pasadas = computed(() => this.reparto().pasadas);

  protected puedeEditar(): boolean {
    const rol = this.auth.rol();
    return rol === 'RECEPCIONISTA' || rol === 'ADMINISTRADOR';
  }

  /** HU-14 · RF-17: reservar en nombre de otro es de recepción y administración. */
  protected puedeReservar(): boolean {
    return this.puedeEditar();
  }

  /** Cómo se lee el estado de una sesión, en vez de la constante que manda el servidor. */
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

  /** HU-17 · RF-23: planificar es del odontólogo y del administrador. */
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

  /**
   * Cerrar una sesión es del administrador y del odontólogo que firmó el plan, que
   * es la misma pregunta que decide la suspensión. Se compara contra el registro
   * propio y no contra la cuenta, igual que hace el servidor.
   */
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

  /**
   * Los planes van en su propia consulta y no dentro de la ficha: la ficha es de
   * HU-13 y la ven los cuatro roles, mientras que los planes solo los alcanzan
   * quienes pueden planificar. Meterlos en el mismo cuerpo obligaría a vaciarlos
   * según quién mire.
   */
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

    // Solo hace falta para decidir qué planes puede cerrar este profesional; para
    // los demás roles sería un par de llamadas que no cambian nada de la pantalla.
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
        // Ausente, no vacio: es un PUT y el servidor borra lo que no llega.
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
    // `fecha` y `hora` son cadenas en hora local de la clinica: se comparan como
    // texto ISO, sin convertirlas a Date, que las desplazaria al huso del navegador.
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
    // El servidor las manda de la mas reciente a la mas antigua; las futuras se
    // leen mejor al reves, empezando por la mas proxima.
    return { futuras: futuras.slice().reverse(), pasadas };
  }
}
