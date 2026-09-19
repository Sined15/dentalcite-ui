import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { citasAfectadas, mensajeDeError } from '../../../core/http/api-error';
import {
  Bloqueo,
  BloqueoRequest,
  CalendarioPublico,
  Consultorio,
  Odontologo,
} from '../../../models';
import { AuthService } from '../../../core/auth/auth.service';
import { BloqueoService } from '../../../services/bloqueo.service';
import { ConsultorioService } from '../../../services/consultorio.service';
import { OdontologoService } from '../../../services/odontologo.service';
import { PublicoService } from '../../../services/publico.service';
import { UsuarioService } from '../../../services/usuario.service';
import { cargarTodasLasPaginas } from '../../../shared/buscar-en-paginas';
import { claseDeDias } from '../../../shared/dias-de-atencion';
import { miOdontologo } from '../../../shared/mi-odontologo';
import { CitasAfectadasDialogo } from '../citas-afectadas-dialogo';

type Ambito = 'odontologo' | 'consultorio';

@Component({
  selector: 'app-bloqueo-edit',
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
  ],
  template: `
    <h1>{{ esEdicion() ? 'Editar bloqueo' : 'Nuevo bloqueo' }}</h1>

    <mat-card class="tarjeta">
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Guardando" />
      }
      <mat-card-content>
        <form [formGroup]="formulario" (ngSubmit)="enviar()">
          <!--
            Hay que indicar exactamente uno de odontologoId o consultorioId.
            Bean Validation no lo comprueba —ninguno lleva anotacion—, lo hace
            el servicio y devuelve 400, asi que se modela como excluyente.

            El odontologo no elige: solo puede bloquear su propia agenda, y un
            consultorio no puede bloquearlo en absoluto. El servidor responde 403
            a las dos cosas, de modo que ofrecerle el desplegable de sus colegas
            era mandarle a pulsar algo que no podia funcionar.
          -->
          @if (!soloLoSuyo()) {
            <fieldset>
              <legend>Que se bloquea</legend>
              <mat-radio-group formControlName="ambito" (change)="cambiarAmbito()">
                <mat-radio-button value="odontologo">La agenda de un odontólogo</mat-radio-button>
                <mat-radio-button value="consultorio">Un consultorio</mat-radio-button>
              </mat-radio-group>
            </fieldset>
          }

          @if (formulario.controls.ambito.value === 'odontologo') {
            @if (soloLoSuyo()) {
              <p class="propio">
                Se bloquea <strong>tu agenda</strong>
                @if (miRegistro(); as mio) {
                  , la de {{ mio.nombres }} {{ mio.apellidos }}
                }
                .
              </p>
            } @else {
              <mat-form-field appearance="outline">
                <mat-label>Odontólogo</mat-label>
                <mat-select formControlName="odontologoId">
                  @for (odo of odontologos(); track odo.id) {
                    <mat-option [value]="odo.id">{{ odo.nombres }} {{ odo.apellidos }}</mat-option>
                  }
                </mat-select>
                @if (formulario.controls.odontologoId.hasError('required')) {
                  <mat-error>Debes elegir un odontólogo</mat-error>
                }
              </mat-form-field>
            }
          } @else {
            <mat-form-field appearance="outline">
              <mat-label>Consultorio</mat-label>
              <mat-select formControlName="consultorioId">
                @for (con of consultorios(); track con.id) {
                  <mat-option [value]="con.id">{{ con.nombre }}</mat-option>
                }
              </mat-select>
              @if (formulario.controls.consultorioId.hasError('required')) {
                <mat-error>Debes elegir un consultorio</mat-error>
              }
            </mat-form-field>
          }

          <mat-form-field appearance="outline">
            <mat-label>Motivo</mat-label>
            <input matInput formControlName="motivo" />
            @if (formulario.controls.motivo.hasError('required')) {
              <mat-error>El motivo es obligatorio</mat-error>
            }
          </mat-form-field>

          <!--
            El dia se marca en el calendario y la hora va aparte. Un campo unico
            de fecha y hora obliga a teclear las dos cosas, y admite dias que no
            existen; el calendario no.
          -->
          <div class="fila">
            <mat-form-field appearance="outline">
              <mat-label>Dia de inicio</mat-label>
              <input
                matInput
                readonly
                [matDatepicker]="calendarioInicio"
                formControlName="diaInicio"
                (click)="calendarioInicio.open()"
              />
              <mat-datepicker-toggle matIconSuffix [for]="calendarioInicio" />
              <mat-datepicker #calendarioInicio [dateClass]="diasCerrados()" />
              @if (formulario.controls.diaInicio.hasError('required')) {
                <mat-error>Marca el dia en el calendario</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="hora">
              <mat-label>Hora de inicio</mat-label>
              <input matInput type="time" formControlName="horaInicio" />
              @if (formulario.controls.horaInicio.hasError('required')) {
                <mat-error>La hora es obligatoria</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="fila">
            <mat-form-field appearance="outline">
              <mat-label>Dia de fin</mat-label>
              <input
                matInput
                readonly
                [matDatepicker]="calendarioFin"
                [min]="formulario.controls.diaInicio.value"
                formControlName="diaFin"
                (click)="calendarioFin.open()"
              />
              <mat-datepicker-toggle matIconSuffix [for]="calendarioFin" />
              <mat-datepicker #calendarioFin [dateClass]="diasCerrados()" />
              @if (formulario.controls.diaFin.hasError('required')) {
                <mat-error>Marca el dia en el calendario</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="hora">
              <mat-label>Hora de fin</mat-label>
              <input matInput type="time" formControlName="horaFin" />
              @if (formulario.controls.horaFin.hasError('required')) {
                <mat-error>La hora es obligatoria</mat-error>
              }
            </mat-form-field>
          </div>

          @if (formulario.hasError('rangoInvalido')) {
            <p class="error" role="alert">La fecha de inicio debe ser anterior a la de fin</p>
          }

          @if (error(); as mensaje) {
            <p class="error" role="alert">{{ mensaje }}</p>
          }

          <div class="acciones">
            <button mat-button type="button" (click)="cancelar()">Cancelar</button>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="formulario.invalid || cargando()"
            >
              Guardar
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
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
    fieldset {
      border: none;
      padding: 0;
      margin: 0 0 1rem;
    }
    legend {
      font-size: 0.875rem;
      opacity: 0.8;
      margin-bottom: 0.5rem;
    }
    mat-radio-group {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .fila {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .fila mat-form-field {
      flex: 1 1 14rem;
    }
    .fila mat-form-field.hora {
      flex: 0 1 9rem;
    }
    .acciones {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      font-size: 0.875rem;
    }
    .propio {
      margin: 0 0 1rem;
    }
  `,
})
export class BloqueoEdit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(BloqueoService);
  private readonly odontologoService = inject(OdontologoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly auth = inject(AuthService);
  private readonly publicoService = inject(PublicoService);
  private readonly consultorioService = inject(ConsultorioService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogo = inject(MatDialog);

  private readonly id = this.ruta.snapshot.paramMap.get('id');

  protected readonly esEdicion = signal(this.id !== null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly odontologos = signal<Odontologo[]>([]);

  /**
   * Quien solo puede bloquear lo suyo. Recepción y administración bloquean la
   * agenda de cualquiera y también un consultorio; el odontólogo, únicamente la
   * propia, que es lo que comprueba el servidor antes de escribir.
   */
  protected readonly soloLoSuyo = computed(() => this.auth.rol() === 'ODONTOLOGO');

  /** Su registro, del que sale el identificador que viaja en el cuerpo. */
  protected readonly miRegistro = signal<Odontologo | null>(null);
  protected readonly consultorios = signal<Consultorio[]>([]);

  /**
   * Los dias sin atencion se atenuan pero **se pueden marcar**: una ausencia
   * empieza el viernes y acaba el lunes, y obligar a que los extremos caigan en
   * dia laborable haria imposible bloquear un puente.
   */
  protected readonly diasAbiertos = signal<CalendarioPublico | null>(null);
  protected readonly diasCerrados = computed(() => claseDeDias(this.diasAbiertos()));

  protected readonly formulario = this.fb.nonNullable.group(
    {
      ambito: ['odontologo' as Ambito, [Validators.required]],
      odontologoId: ['', [Validators.required]],
      consultorioId: [''],
      motivo: ['', [Validators.required]],
      diaInicio: [null as Date | null, [Validators.required]],
      horaInicio: ['09:00', [Validators.required]],
      diaFin: [null as Date | null, [Validators.required]],
      horaFin: ['13:00', [Validators.required]],
    },
    {
      validators: (grupo) => {
        const inicio = instante(
          grupo.get('diaInicio')?.value as Date | null,
          grupo.get('horaInicio')?.value as string,
        );
        const fin = instante(
          grupo.get('diaFin')?.value as Date | null,
          grupo.get('horaFin')?.value as string,
        );
        return inicio && fin && inicio.getTime() >= fin.getTime() ? { rangoInvalido: true } : null;
      },
    },
  );

  constructor() {
    this.publicoService.calendario().subscribe({
      next: (dias) => this.diasAbiertos.set(dias),
      // Sin el dato el calendario no atenua nada, que es como estaba antes.
      error: () => this.diasAbiertos.set(null),
    });

    if (this.soloLoSuyo()) {
      // El identificador se resuelve aqui y no se elige: es el mismo camino
      // —cuenta, ficha, registro— por el que el servidor decide si el bloqueo es
      // sobre lo propio, asi que preguntarlo de otra forma podria discrepar de su
      // veredicto. Sin registro no hay agenda que bloquear, y se dice en vez de
      // dejar un formulario que fallaria al enviarse.
      miOdontologo(this.usuarioService, this.odontologoService).subscribe((mio) => {
        this.miRegistro.set(mio);
        if (mio) {
          this.formulario.patchValue({ ambito: 'odontologo', odontologoId: mio.id });
        } else {
          this.error.set('Tu cuenta no tiene un registro de odontólogo asociado.');
        }
      });
    } else {
      cargarTodasLasPaginas((pagina) =>
        this.odontologoService.listar({ page: pagina, size: 100 }),
      ).subscribe({
        next: (lista) => this.odontologos.set(lista.filter((o) => o.activo)),
        error: (err: unknown) => this.error.set(mensajeDeError(err)),
      });
    }

    this.consultorioService.listar().subscribe({
      next: (lista) => this.consultorios.set(lista),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

    if (!this.id) {
      return;
    }

    const fila = this.router.getCurrentNavigation()?.extras.state?.['fila'] as Bloqueo | undefined;
    if (fila) {
      this.rellenar(fila);
      return;
    }

    // El listado de bloqueos no esta paginado, asi que basta con recargarlo.
    this.cargando.set(true);
    this.servicio.listar().subscribe({
      next: (lista) => {
        this.cargando.set(false);
        const encontrado = lista.find((b) => b.id === this.id);
        if (encontrado) {
          this.rellenar(encontrado);
        } else {
          this.error.set('No se encontró el bloqueo indicado.');
        }
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  private rellenar(fila: Bloqueo): void {
    const ambito: Ambito = fila.consultorioId ? 'consultorio' : 'odontologo';
    this.formulario.patchValue({
      ambito,
      odontologoId: fila.odontologoId ?? '',
      consultorioId: fila.consultorioId ?? '',
      motivo: fila.motivo,
      diaInicio: aDia(fila.fechaInicio),
      horaInicio: aHora(fila.fechaInicio),
      diaFin: aDia(fila.fechaFin),
      horaFin: aHora(fila.fechaFin),
    });
    this.cambiarAmbito();
  }

  /** Solo el control del ambito elegido es obligatorio. */
  protected cambiarAmbito(): void {
    const esOdontologo = this.formulario.controls.ambito.value === 'odontologo';
    const odo = this.formulario.controls.odontologoId;
    const con = this.formulario.controls.consultorioId;

    if (esOdontologo) {
      odo.addValidators(Validators.required);
      con.removeValidators(Validators.required);
      con.setValue('');
    } else {
      con.addValidators(Validators.required);
      odo.removeValidators(Validators.required);
      odo.setValue('');
    }
    odo.updateValueAndValidity({ emitEvent: false });
    con.updateValueAndValidity({ emitEvent: false });
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();
    const cuerpo: BloqueoRequest = {
      motivo: valores.motivo,
      fechaInicio: instante(valores.diaInicio, valores.horaInicio)!.toISOString(),
      fechaFin: instante(valores.diaFin, valores.horaFin)!.toISOString(),
      ...(valores.ambito === 'odontologo'
        ? { odontologoId: valores.odontologoId }
        : { consultorioId: valores.consultorioId }),
    };

    const peticion = this.id
      ? this.servicio.reemplazar(this.id, cuerpo)
      : this.servicio.crear(cuerpo);

    peticion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.snackBar.open(this.id ? 'Bloqueo actualizado.' : 'Bloqueo registrado.', 'Cerrar', {
          duration: 4000,
        });
        void this.router.navigate(['/bloqueos']);
      },
      error: (err: unknown) => {
        this.cargando.set(false);

        // RN-03: si el rango alcanza citas confirmadas, el 409 las enumera. Se
        // muestran como tabla para que el usuario sepa cuales cancelar.
        const citas = citasAfectadas(err);
        if (citas && citas.length > 0) {
          this.dialogo.open(CitasAfectadasDialogo, {
            data: { mensaje: mensajeDeError(err), citas },
            width: '44rem',
          });
          return;
        }

        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected cancelar(): void {
    void this.router.navigate(['/bloqueos']);
  }
}

/**
 * El dia marcado en el calendario y la hora tecleada, juntos, en hora local.
 *
 * Se construye con el constructor de componentes y no concatenando una cadena:
 * al interpretar una fecha con hora el navegador puede tomarla como UTC, y en
 * Lima eso adelantaria el bloqueo cinco horas.
 */
function instante(dia: Date | null, hora: string): Date | null {
  if (!dia || !hora) {
    return null;
  }
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), horas, minutos);
}

/** ISO con desfase -> el dia local a medianoche, que es lo que el calendario marca. */
function aDia(iso: string): Date {
  const fecha = new Date(iso);
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** ISO con desfase -> "HH:mm" en hora local. */
function aHora(iso: string): string {
  const fecha = new Date(iso);
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}
