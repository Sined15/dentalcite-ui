import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
  ],
  template: `
    <h1>{{ esEdicion() ? 'Editar bloqueo' : 'Nuevo bloqueo' }}</h1>
    <p class="ayuda">
      Cierra una agenda o un consultorio durante un rango. Mientras dure, ese horario deja de
      ofrecerse al pedir cita.
    </p>

    <mat-card class="tarjeta" appearance="outlined">
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Guardando" />
      }
      <mat-card-content>
        <form [formGroup]="formulario" (ngSubmit)="enviar()">
          @if (!soloLoSuyo()) {
            <fieldset>
              <legend>¿Qué se bloquea?</legend>
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

          <section class="dc-seccion" aria-labelledby="seccion-rango">
          <h2 id="seccion-rango">Desde y hasta</h2>
          <div class="fila">
            <mat-form-field appearance="outline">
              <mat-label>Día de inicio</mat-label>
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
                <mat-error>Marca el día en el calendario</mat-error>
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
              <mat-label>Día de fin</mat-label>
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
                <mat-error>Marca el día en el calendario</mat-error>
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
            <p class="error" role="alert">La fecha de inicio debe ser anterior a la de fin.</p>
          }
          </section>

          <p class="dc-aviso dc-aviso--advertencia">
            <mat-icon aria-hidden="true">warning</mat-icon>
            <span>
              Si ya hay citas confirmadas en ese rango, no se bloquea: te mostramos cuáles son para
              que las muevas o canceles antes.
            </span>
          </p>

          @if (error(); as mensaje) {
            <p class="error" role="alert">{{ mensaje }}</p>
          }

          <div class="acciones">
            <button mat-button type="button" (click)="cancelar()">Cancelar</button>
            <button
              mat-flat-button
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
      font: var(--text-display-sm);
      letter-spacing: -0.01em;
      margin: 0 0 var(--space-5);
    }
    .ayuda {
      margin: calc(-1 * var(--space-3)) 0 var(--space-5);
      max-width: var(--layout-prose);
      color: var(--ink-muted);
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
      font: var(--text-label);
      padding: 0;
      margin-bottom: var(--space-2);
    }
    mat-radio-group {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: var(--space-3);
    }
    mat-radio-button {
      padding-right: var(--space-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: var(--surface);
    }
    mat-radio-button.mat-mdc-radio-checked {
      border-color: var(--brand);
      background: var(--brand-soft);
      color: var(--on-brand-soft);
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
    @media (max-width: 30rem) {
      .acciones {
        flex-direction: column-reverse;
      }
      .acciones button {
        width: 100%;
      }
    }
    .error {
      color: var(--danger-ink);
      font: var(--text-body-sm);
    }
    .propio {
      margin: 0 0 var(--space-4);
    }
    .fila input[type='time'] {
      font-family: var(--font-mono);
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

  protected readonly soloLoSuyo = computed(() => this.auth.rol() === 'ODONTOLOGO');

  protected readonly miRegistro = signal<Odontologo | null>(null);
  protected readonly consultorios = signal<Consultorio[]>([]);

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
      error: () => this.diasAbiertos.set(null),
    });

    if (this.soloLoSuyo()) {
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

function instante(dia: Date | null, hora: string): Date | null {
  if (!dia || !hora) {
    return null;
  }
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), horas, minutos);
}

function aDia(iso: string): Date {
  const fecha = new Date(iso);
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function aHora(iso: string): string {
  const fecha = new Date(iso);
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}
