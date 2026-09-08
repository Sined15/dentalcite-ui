import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeDeError } from '../../../core/http/api-error';
import { ROLES, Rol, TIPOS_DOCUMENTO, TipoDocumento, Usuario } from '../../../models';
import { UsuarioService } from '../../../services/usuario.service';
import { PasswordGeneradaDialogo } from '../password-generada-dialogo';

@Component({
  selector: 'app-usuario-edit',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <h1>{{ esEdicion() ? 'Editar cuenta' : 'Nueva cuenta' }}</h1>

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
              <mat-error>El nombre es obligatorio</mat-error>
            }
          </mat-form-field>

          @if (!esEdicion()) {
            <mat-form-field appearance="outline">
              <mat-label>Correo</mat-label>
              <input matInput type="email" formControlName="correo" />
              <mat-hint>El correo no se puede cambiar despues del alta</mat-hint>
              @if (formulario.controls.correo.hasError('required')) {
                <mat-error>El correo es obligatorio</mat-error>
              } @else if (formulario.controls.correo.hasError('email')) {
                <mat-error>El formato del correo es inválido</mat-error>
              }
            </mat-form-field>
          }

          <mat-form-field appearance="outline">
            <mat-label>Rol</mat-label>
            <mat-select formControlName="rol">
              @for (rol of roles; track rol) {
                <mat-option [value]="rol">{{ rol }}</mat-option>
              }
            </mat-select>
            @if (formulario.controls.rol.hasError('required')) {
              <mat-error>El rol es obligatorio</mat-error>
            }
          </mat-form-field>

          @if (!esEdicion()) {
            <!--
              RN-10: el documento crea o vincula la ficha de la persona. La
              regla condicional la aplica el servicio, no Bean Validation:
              omitirlo en un alta ODONTOLOGO devuelve 400.
            -->
            @if (esOdontologo()) {
              <p class="aviso">
                El rol ODONTOLOGO necesita tipo y numero de documento: de ahi sale la ficha que
                despues exige su registro como odontologo (RF-10, RN-11).
              </p>
            }

            <div class="fila">
              <mat-form-field appearance="outline">
                <mat-label>Tipo de documento</mat-label>
                <mat-select formControlName="tipoDocumento">
                  <mat-option [value]="''">Sin documento</mat-option>
                  @for (tipo of tiposDocumento; track tipo) {
                    <mat-option [value]="tipo">{{ tipo }}</mat-option>
                  }
                </mat-select>
                @if (formulario.controls.tipoDocumento.hasError('required')) {
                  <mat-error>Obligatorio para el rol ODONTOLOGO</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Número de documento</mat-label>
                <input matInput formControlName="documento" />
                @if (formulario.controls.documento.hasError('required')) {
                  <mat-error>Obligatorio para el rol ODONTOLOGO</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Contraseña provisional (opcional)</mat-label>
              <input matInput type="text" formControlName="passwordProvisional" autocomplete="off" />
              <mat-hint>Si la dejas vacia, el sistema la genera y la muestra una sola vez</mat-hint>
              @if (formulario.controls.passwordProvisional.hasError('minlength')) {
                <mat-error>Debe tener al menos 8 caracteres</mat-error>
              }
            </mat-form-field>
          } @else {
            <mat-checkbox formControlName="activo">Cuenta activa</mat-checkbox>
            <p class="nota">
              Desactivarla le impide iniciar sesion (RN-12) e invalida sus tokens vigentes.
            </p>
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
    .fila {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .fila mat-form-field {
      flex: 1 1 12rem;
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
    .aviso {
      background: var(--mat-sys-surface-container, #eee);
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      margin: 0 0 0.5rem;
    }
    .nota {
      font-size: 0.8125rem;
      opacity: 0.75;
      margin: 0.25rem 0 0;
    }
  `,
})
export class UsuarioEdit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(UsuarioService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogo = inject(MatDialog);

  private readonly id = this.ruta.snapshot.paramMap.get('id');

  protected readonly roles = ROLES;
  protected readonly tiposDocumento = TIPOS_DOCUMENTO;

  protected readonly esEdicion = signal(this.id !== null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    rol: ['PACIENTE' as Rol, [Validators.required]],
    tipoDocumento: ['' as TipoDocumento | ''],
    documento: [''],
    passwordProvisional: ['', [Validators.minLength(8)]],
    activo: [true],
  });

  private readonly rolSeleccionado = toSignal(this.formulario.controls.rol.valueChanges, {
    initialValue: this.formulario.controls.rol.value,
  });

  protected readonly esOdontologo = signal(false);

  constructor() {
    if (this.id) {
      // En edicion, correo y documento no se envian: el PUT solo reemplaza
      // nombre, rol y estado.
      this.formulario.controls.correo.disable();
      this.formulario.controls.tipoDocumento.disable();
      this.formulario.controls.documento.disable();
      this.formulario.controls.passwordProvisional.disable();
      this.cargarParaEdicion();
    } else {
      this.formulario.controls.activo.disable();
    }

    // El documento pasa a obligatorio cuando el rol elegido es ODONTOLOGO.
    effect(() => {
      const esOdo = this.rolSeleccionado() === 'ODONTOLOGO';
      this.esOdontologo.set(esOdo);

      if (this.esEdicion()) {
        return;
      }

      const tipo = this.formulario.controls.tipoDocumento;
      const doc = this.formulario.controls.documento;

      if (esOdo) {
        tipo.addValidators(Validators.required);
        doc.addValidators(Validators.required);
      } else {
        tipo.removeValidators(Validators.required);
        doc.removeValidators(Validators.required);
      }
      tipo.updateValueAndValidity({ emitEvent: false });
      doc.updateValueAndValidity({ emitEvent: false });
    });
  }

  private cargarParaEdicion(): void {
    const fila = this.router.getCurrentNavigation()?.extras.state?.['fila'] as Usuario | undefined;

    if (fila) {
      this.rellenar(fila);
      return;
    }

    // A diferencia del catalogo, usuarios si expone GET /{id}.
    this.cargando.set(true);
    this.servicio.obtener(this.id as string).subscribe({
      next: (usuario) => {
        this.cargando.set(false);
        this.rellenar(usuario);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  private rellenar(fila: Usuario): void {
    this.formulario.patchValue({
      nombre: fila.nombre,
      correo: fila.correo,
      rol: fila.rol,
      activo: fila.activo,
    });
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();

    if (this.id) {
      // PUT: reemplazo total, los tres campos obligatorios.
      this.servicio
        .reemplazar(this.id, {
          nombre: valores.nombre,
          rol: valores.rol,
          activo: valores.activo,
        })
        .subscribe({
          next: () => {
            this.cargando.set(false);
            this.snackBar.open('Cuenta actualizada.', 'Cerrar', { duration: 4000 });
            void this.router.navigate(['/usuarios']);
          },
          error: (err: unknown) => {
            this.cargando.set(false);
            this.error.set(mensajeDeError(err));
          },
        });
      return;
    }

    this.servicio
      .crear({
        nombre: valores.nombre,
        correo: valores.correo,
        rol: valores.rol,
        tipoDocumento: valores.tipoDocumento || undefined,
        documento: valores.documento || undefined,
        passwordProvisional: valores.passwordProvisional || undefined,
      })
      .subscribe({
        next: (creado) => {
          this.cargando.set(false);
          // El backend solo devuelve la contraseña si la genero el.
          if (creado.passwordProvisional) {
            this.dialogo.open(PasswordGeneradaDialogo, {
              data: { nombre: creado.nombre, password: creado.passwordProvisional },
              width: '28rem',
              disableClose: true,
            });
          } else {
            this.snackBar.open('Cuenta creada.', 'Cerrar', { duration: 4000 });
          }
          void this.router.navigate(['/usuarios']);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected cancelar(): void {
    void this.router.navigate(['/usuarios']);
  }
}
