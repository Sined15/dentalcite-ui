import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeDeError } from '../../../core/http/api-error';
import { Especialidad } from '../../../models';
import { EspecialidadService } from '../../../services/especialidad.service';
import { buscarEnPaginas } from '../../../shared/buscar-en-paginas';
import { visualDeEspecialidad } from '../../../shared/especialidad-visual';

@Component({
  selector: 'app-especialidad-edit',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <h1>{{ esEdicion() ? 'Editar especialidad' : 'Nueva especialidad' }}</h1>
    <p class="ayuda">
      El nombre y la imagen se ven en la galería pública. Cada tratamiento lo atienden solo los
      odontólogos que tienen la especialidad que exige.
    </p>

    <div class="disposicion">
    <mat-card class="tarjeta" appearance="outlined">
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
            <mat-label>Descripción (opcional)</mat-label>
            <textarea matInput rows="3" formControlName="descripcion"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Imagen (opcional)</mat-label>
            <input matInput formControlName="imagenUrl" placeholder="/img/catalogo/ejemplo.svg" />
            <mat-hint>Ruta o URL de la imagen que se ve en la galería pública</mat-hint>
          </mat-form-field>

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

    <aside class="previa" aria-label="Vista previa">
      <p class="previa-titulo">Así se verá en la galería</p>
      <article class="previa-tarjeta" [attr.data-spec]="visual().clave">
        <span class="dc-spec-tile" aria-hidden="true">
          <mat-icon>{{ visual().icono }}</mat-icon>
        </span>
        <p class="previa-rotulo">ESPECIALIDAD</p>
        <h2>{{ valores().nombre || 'Nombre de la especialidad' }}</h2>
        @if (valores().descripcion) {
          <p class="previa-texto">{{ valores().descripcion }}</p>
        }
      </article>
      <p class="dc-aviso">
        <mat-icon aria-hidden="true">auto_awesome</mat-icon>
        <span>El color y el icono se asignan por el nombre; no hay que elegirlos.</span>
      </p>
    </aside>
    </div>
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
    .disposicion {
      display: grid;
      grid-template-columns: minmax(0, 34rem) minmax(0, 20rem);
      gap: var(--space-6);
      align-items: start;
    }
    .tarjeta {
      max-width: 34rem;
    }
    .previa-titulo {
      margin: 0 0 var(--space-3);
      font: var(--text-label);
      color: var(--ink-muted);
    }
    .previa-tarjeta {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-5);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }
    .previa-tarjeta h2 {
      margin: 0;
      font: var(--text-title-sm);
    }
    .previa-rotulo {
      margin: 0;
      font: var(--text-overline);
      letter-spacing: 0.08em;
      color: var(--spec);
    }
    .previa-texto {
      margin: 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    @media (max-width: 60rem) {
      .disposicion {
        grid-template-columns: minmax(0, 1fr);
      }
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
    imagenUrl: [''],
  });

  protected readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });
  protected readonly visual = computed(() => visualDeEspecialidad(this.valores().nombre ?? ''));

  constructor() {
    if (!this.id) {
      return;
    }

    const fila = this.router.getCurrentNavigation()?.extras.state?.['fila'] as
      | Especialidad
      | undefined;

    if (fila) {
      this.formulario.patchValue({
        nombre: fila.nombre,
        descripcion: fila.descripcion ?? '',
        imagenUrl: fila.imagenUrl ?? '',
      });
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
            imagenUrl: encontrada.imagenUrl ?? '',
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
      imagenUrl: valores.imagenUrl || undefined,
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
