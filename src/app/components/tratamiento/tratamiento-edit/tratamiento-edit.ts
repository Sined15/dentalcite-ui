import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeDeError } from '../../../core/http/api-error';
import {
  DURACION_MAX,
  DURACION_MIN,
  DURACION_PASO,
  Especialidad,
  Tratamiento,
} from '../../../models';
import { EspecialidadService } from '../../../services/especialidad.service';
import { TratamientoService } from '../../../services/tratamiento.service';
import { buscarEnPaginas, cargarTodasLasPaginas } from '../../../shared/buscar-en-paginas';

/**
 * RN-04: la duracion es multiplo de 15. El DTO solo declara `@Min(15)`; el
 * techo y el multiplo los imponen el servicio y una restriccion CHECK de la
 * base, asi que se validan aqui para no depender de un 400.
 */
const multiploDe15: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value as number | null;
  if (valor === null || valor === undefined) {
    return null;
  }
  return valor % DURACION_PASO === 0 ? null : { multiplo: true };
};

@Component({
  selector: 'app-tratamiento-edit',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <h1>{{ esEdicion() ? 'Editar tratamiento' : 'Nuevo tratamiento' }}</h1>

    <mat-card class="tarjeta">
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Guardando" />
      }
      <mat-card-content>
        <form [formGroup]="formulario" (ngSubmit)="enviar()">
          <div class="fila">
            <mat-form-field appearance="outline">
              <mat-label>Código</mat-label>
              <input matInput formControlName="codigo" />
              @if (formulario.controls.codigo.hasError('required')) {
                <mat-error>El código es obligatorio</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="nombre" />
              @if (formulario.controls.nombre.hasError('required')) {
                <mat-error>El nombre es obligatorio</mat-error>
              }
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Descripcion (opcional)</mat-label>
            <textarea matInput rows="3" formControlName="descripcion"></textarea>
          </mat-form-field>

          <!--
            RF-09 y RF-10 (v4): ruta de la imagen del catalogo publico. No es una
            subida: las de demostracion viajan con este cliente, en
            public/img/catalogo/.
          -->
          <mat-form-field appearance="outline">
            <mat-label>Imagen (opcional)</mat-label>
            <input matInput formControlName="imagenUrl" placeholder="/img/catalogo/ejemplo.svg" />
            <mat-hint>Ruta o URL de la imagen que se ve en las paginas publicas</mat-hint>
          </mat-form-field>

          <div class="fila">
            <mat-form-field appearance="outline">
              <mat-label>Duración en minutos</mat-label>
              <input
                matInput
                type="number"
                formControlName="duracionMinutos"
                [min]="duracionMin"
                [max]="duracionMax"
                [step]="duracionPaso"
              />
              <mat-hint>Multiplo de {{ duracionPaso }}, entre {{ duracionMin }} y {{ duracionMax }}</mat-hint>
              @if (formulario.controls.duracionMinutos.hasError('required')) {
                <mat-error>La duración es obligatoria</mat-error>
              } @else if (formulario.controls.duracionMinutos.hasError('min')) {
                <mat-error>La duracion minima es de {{ duracionMin }} minutos</mat-error>
              } @else if (formulario.controls.duracionMinutos.hasError('max')) {
                <mat-error>La duracion maxima es de {{ duracionMax }} minutos</mat-error>
              } @else if (formulario.controls.duracionMinutos.hasError('multiplo')) {
                <mat-error>Debe ser un multiplo de {{ duracionPaso }} minutos</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Especialidad requerida</mat-label>
              <mat-select formControlName="especialidadId">
                @for (esp of especialidades(); track esp.id) {
                  <mat-option [value]="esp.id">{{ esp.nombre }}</mat-option>
                }
              </mat-select>
              @if (formulario.controls.especialidadId.hasError('required')) {
                <mat-error>La especialidad es obligatoria</mat-error>
              }
            </mat-form-field>
          </div>

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
      max-width: 42rem;
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
export class TratamientoEdit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(TratamientoService);
  private readonly especialidadService = inject(EspecialidadService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly id = this.ruta.snapshot.paramMap.get('id');

  protected readonly duracionMin = DURACION_MIN;
  protected readonly duracionMax = DURACION_MAX;
  protected readonly duracionPaso = DURACION_PASO;

  protected readonly esEdicion = signal(this.id !== null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly especialidades = signal<Especialidad[]>([]);

  protected readonly formulario = this.fb.nonNullable.group({
    codigo: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    descripcion: [''],
    duracionMinutos: [
      DURACION_PASO * 2,
      [
        Validators.required,
        Validators.min(DURACION_MIN),
        Validators.max(DURACION_MAX),
        multiploDe15,
      ],
    ],
    especialidadId: ['', [Validators.required]],
    imagenUrl: [''],
  });

  constructor() {
    // Solo las especialidades activas pueden exigirse en un tratamiento.
    cargarTodasLasPaginas((pagina) =>
      this.especialidadService.listar({ page: pagina, size: 100, sort: 'nombre,asc' }),
    ).subscribe({
      next: (lista) => this.especialidades.set(lista.filter((e) => e.activo)),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

    if (!this.id) {
      return;
    }

    const fila = this.router.getCurrentNavigation()?.extras.state?.['fila'] as
      | Tratamiento
      | undefined;

    if (fila) {
      this.rellenar(fila);
      return;
    }

    this.cargando.set(true);
    buscarEnPaginas((pagina) => this.servicio.listar({ page: pagina, size: 50 }), this.id).subscribe(
      {
        next: (encontrado) => {
          this.cargando.set(false);
          if (encontrado) {
            this.rellenar(encontrado);
          } else {
            this.error.set('No se encontró el tratamiento indicado.');
          }
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err));
        },
      },
    );
  }

  /** Se lee `especialidad` anidada y se escribe `especialidadId` plano. */
  private rellenar(fila: Tratamiento): void {
    this.formulario.patchValue({
      codigo: fila.codigo,
      nombre: fila.nombre,
      descripcion: fila.descripcion ?? '',
      duracionMinutos: fila.duracionMinutos,
      especialidadId: fila.especialidad?.id ?? '',
      imagenUrl: fila.imagenUrl ?? '',
    });
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();
    const cuerpo = {
      codigo: valores.codigo,
      nombre: valores.nombre,
      descripcion: valores.descripcion || undefined,
      duracionMinutos: valores.duracionMinutos,
      especialidadId: valores.especialidadId,
      // PUT reemplaza el recurso entero: omitir la imagen la borraria.
      imagenUrl: valores.imagenUrl || undefined,
    };

    const peticion = this.id
      ? this.servicio.reemplazar(this.id, cuerpo)
      : this.servicio.crear(cuerpo);

    peticion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.snackBar.open(this.id ? 'Tratamiento actualizado.' : 'Tratamiento creado.', 'Cerrar', {
          duration: 4000,
        });
        void this.router.navigate(['/tratamientos']);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected cancelar(): void {
    void this.router.navigate(['/tratamientos']);
  }
}
