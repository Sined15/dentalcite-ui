import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeDeError } from '../../../core/http/api-error';
import { Especialidad } from '../../../models';
import { EspecialidadService } from '../../../services/especialidad.service';
import { buscarEnPaginas } from '../../../shared/buscar-en-paginas';

@Component({
  selector: 'app-especialidad-edit',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <h1>{{ esEdicion() ? 'Editar especialidad' : 'Nueva especialidad' }}</h1>

    <mat-card class="tarjeta">
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Guardando" />
      }
      <mat-card-content>
        <form [formGroup]="formulario" (ngSubmit)="enviar()">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" />
            @if (formulario.controls.nombre.hasError('required')) {
              <mat-error>El nombre de la especialidad es obligatorio</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Descripcion (opcional)</mat-label>
            <textarea matInput rows="3" formControlName="descripcion"></textarea>
          </mat-form-field>

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
      max-width: 34rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
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
export class EspecialidadEdit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(EspecialidadService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly id = this.ruta.snapshot.paramMap.get('id');

  protected readonly esEdicion = signal(this.id !== null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
  });

  constructor() {
    if (!this.id) {
      return;
    }

    // El listado pasa la fila por estado de navegacion. Solo hace falta ir a
    // buscarla cuando ese estado se perdio, por ejemplo tras recargar: este
    // recurso no expone `GET /{id}`.
    const fila = this.router.getCurrentNavigation()?.extras.state?.['fila'] as
      | Especialidad
      | undefined;

    if (fila) {
      this.formulario.patchValue({ nombre: fila.nombre, descripcion: fila.descripcion ?? '' });
      return;
    }

    this.cargando.set(true);
    buscarEnPaginas(
      (pagina) => this.servicio.listar({ page: pagina, size: 50 }),
      this.id,
    ).subscribe({
      next: (encontrada) => {
        this.cargando.set(false);
        if (encontrada) {
          this.formulario.patchValue({
            nombre: encontrada.nombre,
            descripcion: encontrada.descripcion ?? '',
          });
        } else {
          this.error.set('No se encontró la especialidad indicada.');
        }
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
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
      nombre: valores.nombre,
      descripcion: valores.descripcion || undefined,
    };

    const peticion = this.id
      ? this.servicio.reemplazar(this.id, cuerpo)
      : this.servicio.crear(cuerpo);

    peticion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.snackBar.open(
          this.id ? 'Especialidad actualizada.' : 'Especialidad creada.',
          'Cerrar',
          { duration: 4000 },
        );
        void this.router.navigate(['/especialidades']);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected cancelar(): void {
    void this.router.navigate(['/especialidades']);
  }
}
