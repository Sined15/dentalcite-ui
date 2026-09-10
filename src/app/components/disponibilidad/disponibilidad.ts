import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import {
  Cita,
  DIAS_MAXIMOS,
  DisponibilidadResponse,
  Odontologo,
  PASO_AGRUPACION_MINUTOS,
  PASO_MOTOR_MINUTOS,
  Tratamiento,
} from '../../models';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { OdontologoService } from '../../services/odontologo.service';
import { TratamientoService } from '../../services/tratamiento.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { BloqueAgrupado, DiaAgrupado, agruparFranjas } from './agrupar-franjas';
import { CitaReservadaDialogo } from './cita-reservada-dialogo';
import { ReservarDialogo, ReservarDialogoDatos, ReservarResultado } from './reservar-dialogo';

@Component({
  selector: 'app-disponibilidad',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <h1>Franjas disponibles</h1>

    <mat-card class="tarjeta">
      <mat-card-content>
        <form [formGroup]="formulario" (ngSubmit)="consultar()">
          <mat-form-field appearance="outline">
            <mat-label>Tratamiento</mat-label>
            <mat-select formControlName="tratamientoId">
              @for (tra of tratamientos(); track tra.id) {
                <mat-option [value]="tra.id">
                  {{ tra.nombre }} · {{ tra.duracionMinutos }} min
                </mat-option>
              }
            </mat-select>
            <mat-hint>La duración de la cita es la del tratamiento.</mat-hint>
            @if (formulario.controls.tratamientoId.hasError('required')) {
              <mat-error>Debes elegir un tratamiento</mat-error>
            }
          </mat-form-field>

          <!--
            RN-08: solo se ofrecen los odontologos que poseen la especialidad que
            el tratamiento exige. El servidor lo aplica igualmente; filtrar aqui
            evita ofrecer una eleccion que devolveria una agenda vacia.
          -->
          <mat-form-field appearance="outline">
            <mat-label>Odontólogo</mat-label>
            <mat-select formControlName="odontologoId">
              <mat-option value="">Cualquier odontólogo</mat-option>
              @for (odo of odontologosAptos(); track odo.id) {
                <mat-option [value]="odo.id">{{ odo.nombres }} {{ odo.apellidos }}</mat-option>
              }
            </mat-select>
            @if (tratamientoElegido() && odontologosAptos().length === 0) {
              <mat-hint
                >Ningún odontólogo tiene la especialidad que exige este tratamiento.</mat-hint
              >
            }
          </mat-form-field>

          <div class="fila">
            <mat-form-field appearance="outline">
              <mat-label>Desde</mat-label>
              <input matInput type="date" formControlName="desde" />
              @if (formulario.controls.desde.hasError('required')) {
                <mat-error>La fecha inicial es obligatoria</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hasta</mat-label>
              <input matInput type="date" formControlName="hasta" />
              @if (formulario.controls.hasta.hasError('required')) {
                <mat-error>La fecha final es obligatoria</mat-error>
              }
            </mat-form-field>
          </div>

          @if (formulario.hasError('rangoInvertido')) {
            <p class="error" role="alert">La fecha inicial debe ser anterior o igual a la final.</p>
          }
          @if (formulario.hasError('rangoLargo')) {
            <p class="error" role="alert">
              El rango consultable es de {{ diasMaximos }} días como máximo.
            </p>
          }

          <p class="nota">
            Las citas se reservan con al menos dos horas de antelación, así que las franjas más
            inmediatas no aparecen.
          </p>

          <div class="acciones">
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="formulario.invalid || cargando()"
            >
              <mat-icon>search</mat-icon>
              Consultar
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Buscando franjas disponibles" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <!--
      El codigo se ve al confirmar, pero cerrar el dialogo no debe destruirlo: el
      listado de citas propias es HU-15 y hasta entonces no hay donde volver a
      consultarlo.
    -->
    @if (ultimaReserva(); as cita) {
      <div class="reservada" role="status">
        <mat-icon aria-hidden="true">event_available</mat-icon>
        <div>
          <strong>Cita reservada · {{ cita.codigo }}</strong>
          <span>
            {{ cita.fecha | date: "EEEE d 'de' MMMM" }}, {{ cita.hora.slice(0, 5) }} ·
            {{ cita.odontologo.nombre }} · {{ cita.consultorio.nombre }}
          </span>
        </div>
      </div>
    }

    @if (consultado() && !cargando() && !error()) {
      <section class="resultados">
        <div class="resumen">
          <p role="status">{{ resumen() }}</p>

          @if (dias().length > 0) {
            <!--
              RN-04: el motor propone cada quince minutos. Por defecto se agrupan
              de treinta en treinta para no fragmentar la eleccion; quien quiera
              el detalle puede pedirlo, porque agrupar no descarta nada.
            -->
            <mat-button-toggle-group
              [value]="paso()"
              (change)="paso.set($event.value)"
              aria-label="Agrupación de las franjas"
            >
              <mat-button-toggle [value]="pasoAgrupacion">Cada 30 min</mat-button-toggle>
              <mat-button-toggle [value]="pasoMotor">Cada 15 min</mat-button-toggle>
            </mat-button-toggle-group>
          }
        </div>

        @for (dia of dias(); track dia.fecha) {
          <section class="dia">
            <h2>{{ dia.fecha | date: "EEEE d 'de' MMMM" }}</h2>
            <ul class="franjas">
              @for (bloque of dia.bloques; track bloque.inicio) {
                <li>
                  <!--
                    Solo el paciente reserva, y solo para si mismo (HU-09). Para el
                    resto de roles la franja es informacion: un boton que devolviera
                    403 al pulsarlo seria un fallo de diseno. Reservar en nombre de
                    otro es HU-14.
                  -->
                  @if (puedeReservar()) {
                    <button
                      type="button"
                      class="franja pulsable"
                      (click)="abrirReserva(dia, bloque)"
                      [attr.aria-label]="etiquetaAccesible(dia, bloque)"
                    >
                      <span class="hora">{{ bloque.inicio }}</span>
                      <span class="quien">{{ etiqueta(bloque) }}</span>
                    </button>
                  } @else {
                    <div class="franja">
                      <span class="hora">{{ bloque.inicio }}</span>
                      <span class="quien" [attr.title]="nombres(bloque)">{{
                        etiqueta(bloque)
                      }}</span>
                    </div>
                  }
                </li>
              }
            </ul>
          </section>
        } @empty {
          <p class="vacio">
            No hay franjas disponibles para ese tratamiento en el rango elegido. Prueba con otras
            fechas o con otro odontólogo.
          </p>
        }
      </section>
    }
  `,
  styles: `
    h1 {
      font-size: 1.5rem;
      margin: 0 0 1rem;
    }
    .tarjeta {
      max-width: 40rem;
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
      flex: 1 1 12rem;
    }
    .nota {
      font-size: 0.875rem;
      opacity: 0.75;
      margin: 0.5rem 0 0;
    }
    .acciones {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
    }
    .resultados {
      margin-top: 1.5rem;
    }
    .resumen {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .resumen p {
      margin: 0;
    }
    .dia {
      margin-bottom: 1.5rem;
    }
    .dia h2 {
      font-size: 1.125rem;
      margin: 0 0 0.5rem;
    }
    /* es-PE escribe el dia de la semana en minuscula; capitalizar la frase
       entera daria «Lunes 14 De Septiembre». */
    .dia h2::first-letter {
      text-transform: uppercase;
    }
    .franjas {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .franja {
      border: 1px solid var(--mat-sys-outline-variant, #c8c6ca);
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      width: 100%;
      text-align: left;
    }
    .pulsable {
      background: var(--mat-sys-surface, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .pulsable:hover {
      background: var(--mat-sys-surface-container-high, #ececee);
    }
    .reservada {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: var(--mat-sys-surface-container-highest, #e2e2e6);
    }
    .reservada div {
      display: flex;
      flex-direction: column;
    }
    .reservada span {
      font-size: 0.875rem;
      opacity: 0.8;
    }
    .hora {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .quien {
      font-size: 0.8125rem;
      opacity: 0.75;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      font-size: 0.875rem;
    }
    .vacio {
      padding: 1.5rem 0;
      opacity: 0.7;
    }
  `,
})
export class Disponibilidad {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(DisponibilidadService);
  private readonly tratamientoService = inject(TratamientoService);
  private readonly odontologoService = inject(OdontologoService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  /** RF-15: reservar es del paciente. Los demás roles solo consultan (HU-14). */
  protected readonly puedeReservar = computed(() => this.auth.rol() === 'PACIENTE');
  /** La última reserva de esta sesión, para que su código siga a la vista. */
  protected readonly ultimaReserva = signal<Cita | null>(null);

  protected readonly diasMaximos = DIAS_MAXIMOS;
  protected readonly pasoMotor = PASO_MOTOR_MINUTOS;
  protected readonly pasoAgrupacion = PASO_AGRUPACION_MINUTOS;

  protected readonly tratamientos = signal<Tratamiento[]>([]);
  protected readonly odontologos = signal<Odontologo[]>([]);
  protected readonly respuesta = signal<DisponibilidadResponse | null>(null);
  protected readonly consultado = signal(false);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly paso = signal<number>(PASO_AGRUPACION_MINUTOS);

  protected readonly formulario = this.fb.nonNullable.group(
    {
      tratamientoId: ['', [Validators.required]],
      odontologoId: [''],
      desde: [hoy(), [Validators.required]],
      hasta: [sumarDias(hoy(), DIAS_MAXIMOS - 1), [Validators.required]],
    },
    {
      // El servidor devuelve 400 en ambos casos; comprobarlo aqui ahorra el
      // viaje y explica el limite antes de pulsar.
      validators: (grupo) => {
        const desde = grupo.get('desde')?.value as string;
        const hasta = grupo.get('hasta')?.value as string;
        if (!desde || !hasta) {
          return null;
        }
        if (desde > hasta) {
          return { rangoInvertido: true };
        }
        return diasEntre(desde, hasta) > DIAS_MAXIMOS ? { rangoLargo: true } : null;
      },
    },
  );

  protected readonly tratamientoElegido = toSignal(
    this.formulario.controls.tratamientoId.valueChanges,
    { initialValue: '' },
  );

  /** RN-08: los que poseen la especialidad que el tratamiento elegido exige. */
  protected readonly odontologosAptos = computed<Odontologo[]>(() => {
    const tratamiento = this.tratamientos().find((t) => t.id === this.tratamientoElegido());
    if (!tratamiento) {
      return [];
    }
    return this.odontologos().filter((o) =>
      o.especialidades.some((e) => e.id === tratamiento.especialidad.id),
    );
  });

  protected readonly dias = computed(() => agruparFranjas(this.respuesta(), this.paso()));

  protected readonly resumen = computed(() => {
    const dias = this.dias();
    if (dias.length === 0) {
      return 'Sin franjas disponibles.';
    }
    const franjas = dias.reduce((total, dia) => total + dia.bloques.length, 0);
    return `${franjas} ${franjas === 1 ? 'franja' : 'franjas'} en ${dias.length} ${
      dias.length === 1 ? 'día' : 'días'
    }.`;
  });

  constructor() {
    cargarTodasLasPaginas((pagina) =>
      this.tratamientoService.listar({ page: pagina, size: 100 }),
    ).subscribe({
      next: (lista) => this.tratamientos.set(lista.filter((t) => t.activo)),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

    cargarTodasLasPaginas((pagina) =>
      this.odontologoService.listar({ page: pagina, size: 100 }),
    ).subscribe({
      next: (lista) => this.odontologos.set(lista.filter((o) => o.activo)),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

    // Cambiar de tratamiento puede dejar al odontologo elegido sin la
    // especialidad requerida: mantenerlo seleccionado pediria al servidor una
    // agenda que RN-08 vaciaria, sin que se viera por que.
    //
    // La lista se lee la primera y fuera de toda condicion. Leerla dentro del
    // `if` la dejaba tras un cortocircuito: con el valor inicial vacio no se
    // llegaba a leer, el efecto no registraba ninguna dependencia de senal y no
    // volvia a ejecutarse nunca. El valor del control no es una senal y no
    // dispara nada por si mismo.
    effect(() => {
      const aptos = this.odontologosAptos();
      const elegido = this.formulario.controls.odontologoId.value;
      if (elegido && !aptos.some((o) => o.id === elegido)) {
        this.formulario.controls.odontologoId.setValue('');
      }
    });
  }

  protected consultar(): void {
    if (this.formulario.invalid || this.cargando()) {
      return;
    }
    const valores = this.formulario.getRawValue();

    this.cargando.set(true);
    this.error.set(null);

    this.servicio
      .consultar({
        tratamientoId: valores.tratamientoId,
        odontologoId: valores.odontologoId || undefined,
        desde: valores.desde,
        hasta: valores.hasta,
      })
      .subscribe({
        next: (respuesta) => {
          this.respuesta.set(respuesta);
          this.consultado.set(true);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.respuesta.set(null);
          this.consultado.set(true);
          this.cargando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  /**
   * Abre la confirmación y, si acaba en reserva, deja el código a la vista y
   * repite la consulta: la franja que se acaba de tomar ya no debe ofrecerse.
   */
  protected abrirReserva(dia: DiaAgrupado, bloque: BloqueAgrupado): void {
    const tratamiento = this.tratamientos().find((t) => t.id === this.tratamientoElegido());
    if (!tratamiento) {
      return;
    }

    const datos: ReservarDialogoDatos = {
      tratamientoId: tratamiento.id,
      tratamientoNombre: tratamiento.nombre,
      duracionMinutos: tratamiento.duracionMinutos,
      fecha: dia.fecha,
      bloque,
    };

    this.dialogo
      .open(ReservarDialogo, { data: datos })
      .afterClosed()
      .subscribe((resultado: ReservarResultado | null | undefined) => {
        if (!resultado) {
          return;
        }

        if (resultado.cita) {
          this.ultimaReserva.set(resultado.cita);
          this.dialogo.open(CitaReservadaDialogo, { data: resultado.cita });
          this.consultar();
          return;
        }

        // RF-16: la franja se ocupó mientras confirmaba, o la cuota se agotó. Se
        // informa y se recalcula, porque la lista que tiene delante ya no vale.
        if (resultado.recargar) {
          this.snackBar.open(resultado.recargar, 'Cerrar', { duration: 8000 });
          this.consultar();
        }
      });
  }

  /** El botón necesita decir a dónde lleva, no solo la hora. */
  protected etiquetaAccesible(dia: DiaAgrupado, bloque: BloqueAgrupado): string {
    return `Reservar el ${dia.fecha} a las ${bloque.inicio} con ${this.nombres(bloque)}`;
  }

  /** Con varios odontologos libres, el recuento; con uno, su nombre. */
  protected etiqueta(bloque: BloqueAgrupado): string {
    if (bloque.odontologos.length === 1) {
      return bloque.odontologos[0].nombre;
    }
    return `${bloque.odontologos.length} odontólogos`;
  }

  protected nombres(bloque: BloqueAgrupado): string {
    return bloque.odontologos.map((o) => o.nombre).join(', ');
  }
}

/** Fecha local de hoy como "YYYY-MM-DD", sin pasar por UTC. */
function hoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const resultado = new Date(a, m - 1, d + dias);
  const mes = String(resultado.getMonth() + 1).padStart(2, '0');
  const dia = String(resultado.getDate()).padStart(2, '0');
  return `${resultado.getFullYear()}-${mes}-${dia}`;
}

/** Dias del rango, ambos extremos incluidos. */
function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  const inicio = new Date(a1, m1 - 1, d1).getTime();
  const fin = new Date(a2, m2 - 1, d2).getTime();
  return Math.round((fin - inicio) / 86_400_000) + 1;
}
