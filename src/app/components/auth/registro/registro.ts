import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { mensajeDeError } from '../../../core/http/api-error';
import { TIPOS_DOCUMENTO, TipoDocumento } from '../../../models';

/** Version del consentimiento que se registra con el alta (RNF-06). */
const VERSION_CONSENTIMIENTO = '1.0';

@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <div class="pantalla-acceso">
      <mat-card class="tarjeta">
        @if (enviando()) {
          <mat-progress-bar mode="indeterminate" aria-label="Creando cuenta" />
        }
        <mat-card-header>
          <mat-card-title>Crear cuenta de paciente</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="formulario" (ngSubmit)="enviar()">
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

            <div class="fila">
              <mat-form-field appearance="outline">
                <mat-label>Tipo de documento</mat-label>
                <mat-select formControlName="tipoDocumento">
                  @for (tipo of tiposDocumento; track tipo) {
                    <mat-option [value]="tipo">{{ tipo }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Número de documento</mat-label>
                <input matInput formControlName="documento" />
                @if (formulario.controls.documento.hasError('required')) {
                  <mat-error>El documento es obligatorio</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Correo</mat-label>
              <input matInput type="email" formControlName="correo" autocomplete="username" />
              @if (formulario.controls.correo.hasError('required')) {
                <mat-error>El correo es obligatorio</mat-error>
              } @else if (formulario.controls.correo.hasError('email')) {
                <mat-error>Debe ser un correo electronico valido</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Teléfono (opcional)</mat-label>
              <input matInput formControlName="telefono" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Contraseña</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="new-password"
              />
              @if (formulario.controls.password.hasError('required')) {
                <mat-error>La contraseña es obligatoria</mat-error>
              } @else if (formulario.controls.password.hasError('minlength')) {
                <mat-error>Debe tener al menos 8 caracteres</mat-error>
              }
            </mat-form-field>

            <mat-checkbox formControlName="consentimientoAceptado">
              Acepto el tratamiento de mis datos personales (version
              {{ versionConsentimiento }})
            </mat-checkbox>
            @if (
              formulario.controls.consentimientoAceptado.touched &&
              formulario.controls.consentimientoAceptado.hasError('requiredTrue')
            ) {
              <p class="error" role="alert">Debes aceptar el consentimiento para registrarte</p>
            }

            @if (error(); as mensaje) {
              <p class="error" role="alert">{{ mensaje }}</p>
            }

            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="formulario.invalid || enviando()"
            >
              Crear cuenta
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <a mat-button routerLink="/login" [queryParams]="{ returnUrl: destinoPedido }"
            >Ya tengo cuenta</a
          >
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: `
    .pantalla-acceso {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100dvh;
      padding: 1rem;
      background: var(--mat-sys-surface-container-low, #f4f4f7);
    }
    .tarjeta {
      width: 100%;
      max-width: 34rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 1rem;
    }
    .fila {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .fila mat-form-field {
      flex: 1 1 12rem;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      margin: 0.5rem 0;
      font-size: 0.875rem;
    }
    button[type='submit'] {
      margin-top: 1rem;
    }
  `,
})
export class Registro {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ruta = inject(ActivatedRoute);

  /**
   * La pantalla a la que se queria llegar antes de crear la cuenta, que se pasa
   * tal cual al login. No se valida aqui: el registro no navega a ella, y el
   * login ya descarta cualquier destino que no sea de esta aplicacion.
   */
  protected readonly destinoPedido = this.ruta.snapshot.queryParamMap.get('returnUrl');

  protected readonly tiposDocumento = TIPOS_DOCUMENTO;
  protected readonly versionConsentimiento = VERSION_CONSENTIMIENTO;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    tipoDocumento: ['DNI' as TipoDocumento, [Validators.required]],
    documento: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    // El backend exige @AssertTrue: sin marcar, responde 400.
    consentimientoAceptado: [false, [Validators.requiredTrue]],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();
    this.auth
      .registrar({
        ...valores,
        telefono: valores.telefono || undefined,
        versionConsentimiento: VERSION_CONSENTIMIENTO,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.snackBar.open('Cuenta creada. Ya puedes iniciar sesión.', 'Cerrar', {
            duration: 5000,
          });
          // El registro no abre sesion: el camino de vuelta sigue por el login.
          void this.router.navigate(['/login'], {
            queryParams: { returnUrl: this.destinoPedido },
          });
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }
}
