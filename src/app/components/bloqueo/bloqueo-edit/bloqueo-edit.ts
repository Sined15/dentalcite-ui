import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { citasAfectadas, mensajeDeError } from '../../../core/http/api-error';
import { Bloqueo, BloqueoRequest, Consultorio, Odontologo } from '../../../models';
import { BloqueoService } from '../../../services/bloqueo.service';
import { ConsultorioService } from '../../../services/consultorio.service';
import { OdontologoService } from '../../../services/odontologo.service';
import { cargarTodasLasPaginas } from '../../../shared/buscar-en-paginas';
import { CitasAfectadasDialogo } from '../citas-afectadas-dialogo';

type Ambito = 'odontologo' | 'consultorio';

@Component({
  selector: 'app-bloqueo-edit',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
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
          -->
          <fieldset>
            <legend>Que se bloquea</legend>
            <mat-radio-group formControlName="ambito" (change)="cambiarAmbito()">
              <mat-radio-button value="odontologo">La agenda de un odontólogo</mat-radio-button>
              <mat-radio-button value="consultorio">Un consultorio</mat-radio-button>
            </mat-radio-group>
          </fieldset>

          @if (formulario.controls.ambito.value === 'odontologo') {
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

          <div class="fila">
            <mat-form-field appearance="outline">
              <mat-label>Desde</mat-label>
              <input matInput type="datetime-local" formControlName="fechaInicio" />
              @if (formulario.controls.fechaInicio.hasError('required')) {
                <mat-error>La fecha de inicio es obligatoria</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hasta</mat-label>
              <input matInput type="datetime-local" formControlName="fechaFin" />
              @if (formulario.controls.fechaFin.hasError('required')) {
                <mat-error>La fecha de fin es obligatoria</mat-error>
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
  `,
})
export class BloqueoEdit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(BloqueoService);
  private readonly odontologoService = inject(OdontologoService);
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
  protected readonly consultorios = signal<Consultorio[]>([]);

  protected readonly formulario = this.fb.nonNullable.group(
    {
      ambito: ['odontologo' as Ambito, [Validators.required]],
      odontologoId: ['', [Validators.required]],
      consultorioId: [''],
      motivo: ['', [Validators.required]],
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
    },
    {
      validators: (grupo) => {
        const inicio = grupo.get('fechaInicio')?.value as string;
        const fin = grupo.get('fechaFin')?.value as string;
        return inicio && fin && inicio >= fin ? { rangoInvalido: true } : null;
      },
    },
  );

  constructor() {
    cargarTodasLasPaginas((pagina) =>
      this.odontologoService.listar({ page: pagina, size: 100 }),
    ).subscribe({
      next: (lista) => this.odontologos.set(lista.filter((o) => o.activo)),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

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
      fechaInicio: aInputLocal(fila.fechaInicio),
      fechaFin: aInputLocal(fila.fechaFin),
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
      fechaInicio: new Date(valores.fechaInicio).toISOString(),
      fechaFin: new Date(valores.fechaFin).toISOString(),
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

/** ISO con desfase -> "YYYY-MM-DDTHH:mm", que es lo que espera el input. */
function aInputLocal(iso: string): string {
  const fecha = new Date(iso);
  const desfase = fecha.getTimezoneOffset();
  return new Date(fecha.getTime() - desfase * 60_000).toISOString().slice(0, 16);
}
