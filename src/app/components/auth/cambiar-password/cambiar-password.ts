import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { mensajeDeError } from '../../../core/http/api-error';
import { UsuarioService } from '../../../services/usuario.service';

function coincideConLaNueva(control: AbstractControl): ValidationErrors | null {
  const nueva = control.parent?.get('nuevoPassword')?.value;
  return control.value && control.value !== nueva ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-cambiar-password',
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
    <div class="pantalla-acceso">
      <mat-card class="tarjeta">
        @if (enviando()) {
          <mat-progress-bar mode="indeterminate" aria-label="Cambiando contraseña" />
        }
        <div class="marca">
          <span class="sello" aria-hidden="true"><mat-icon>medical_services</mat-icon></span>
          <span>Dental<b>Cite</b></span>
        </div>
        <mat-card-header>
          <mat-card-title>Cambia tu contraseña</mat-card-title>
          <mat-card-subtitle>
            {{
              esObligatorio()
                ? 'Para seguir, elige una contraseña que solo tú conozcas.'
                : 'Elige una contraseña que solo tú conozcas.'
            }}
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (esObligatorio()) {
            <p class="aviso">
              <mat-icon aria-hidden="true">info</mat-icon>
              <span>
                Entraste con una contraseña provisional. Hasta que la cambies no podrás usar el
                resto del sistema.
              </span>
            </p>
          }
          <form [formGroup]="formulario" (ngSubmit)="enviar()">
            <mat-form-field appearance="outline">
              <mat-label>{{ esObligatorio() ? 'Contraseña provisional' : 'Contraseña actual' }}</mat-label>
              <input
                matInput
                [type]="verPasswords() ? 'text' : 'password'"
                formControlName="passwordActual"
                autocomplete="current-password"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="verPasswords.set(!verPasswords())"
                [attr.aria-label]="
                  verPasswords() ? 'Ocultar las contraseñas' : 'Mostrar las contraseñas'
                "
                [attr.aria-pressed]="verPasswords()"
              >
                <mat-icon>{{ verPasswords() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (formulario.controls.passwordActual.hasError('required')) {
                <mat-error>
                  {{
                    esObligatorio()
                      ? 'La contraseña provisional es obligatoria'
                      : 'La contraseña actual es obligatoria'
                  }}
                </mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Contraseña nueva</mat-label>
              <input
                matInput
                [type]="verPasswords() ? 'text' : 'password'"
                formControlName="nuevoPassword"
                autocomplete="new-password"
              />
              @if (formulario.controls.nuevoPassword.hasError('required')) {
                <mat-error>La contraseña nueva es obligatoria</mat-error>
              } @else if (formulario.controls.nuevoPassword.hasError('minlength')) {
                <mat-error>Debe tener al menos 8 caracteres</mat-error>
              } @else {
                <mat-hint>Elige una que no uses en otros sitios.</mat-hint>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Repite la contraseña nueva</mat-label>
              <input
                matInput
                [type]="verPasswords() ? 'text' : 'password'"
                formControlName="repetirPassword"
                autocomplete="new-password"
              />
              @if (formulario.controls.repetirPassword.hasError('required')) {
                <mat-error>Repite la contraseña nueva</mat-error>
              } @else if (formulario.controls.repetirPassword.hasError('noCoinciden')) {
                <mat-error>Las dos contraseñas tienen que ser iguales.</mat-error>
              }
            </mat-form-field>

            @if (error(); as mensaje) {
              <p class="error" role="alert">{{ mensaje }}</p>
            }

            <button
              mat-flat-button
              type="submit"
              [disabled]="formulario.invalid || enviando()"
            >
              Cambiar contraseña
            </button>
            <button mat-button type="button" class="salir" (click)="cerrarSesion()">
              Cerrar sesión
            </button>
          </form>
        </mat-card-content>
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
      background: var(--surface-page);
    }
    .tarjeta {
      width: 100%;
      max-width: var(--layout-form);
      padding: var(--space-4) var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
    }
    .marca {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      align-self: flex-start;
      margin: var(--space-2) var(--space-4) var(--space-4);
      font: 700 1.1875rem/1 var(--font-display);
      letter-spacing: -0.01em;
      color: var(--ink);
      text-decoration: none;
    }
    .marca b {
      color: var(--brand-ink);
    }
    .sello {
      width: 1.875rem;
      height: 1.875rem;
      border-radius: var(--radius-sm);
      background: var(--brand);
      color: var(--on-brand);
      display: grid;
      place-items: center;
    }
    .sello mat-icon {
      width: 1.125rem;
      height: 1.125rem;
      font-size: 1.125rem;
    }
    mat-card-title {
      font: var(--text-title-md);
    }
    .aviso {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
      margin: var(--space-2) 0 0;
      padding: var(--space-3) var(--space-4);
      background: var(--accent-soft);
      border-radius: var(--radius-md);
      font: var(--text-body-sm);
      color: var(--ink);
    }
    .aviso mat-icon {
      flex: none;
      color: var(--accent-ink);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 1rem;
    }
    .error {
      color: var(--danger-ink);
      margin: 0 0 1rem;
      font: var(--text-body-sm);
    }
    .salir {
      --mat-button-text-label-text-color: var(--danger-ink);
      min-height: 3rem;
    }
    button[type='submit'] {
      margin-top: 0.5rem;
      min-height: 3rem;
    }
    @media (max-width: 37.5rem) {
      .tarjeta {
        box-shadow: none;
      }
    }
  `,
})
export class CambiarPassword {
  private readonly fb = inject(FormBuilder);
  private readonly usuarios = inject(UsuarioService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly esObligatorio = this.auth.requiereCambioPassword;

  protected readonly verPasswords = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    passwordActual: ['', [Validators.required]],
    nuevoPassword: ['', [Validators.required, Validators.minLength(8)]],
    repetirPassword: ['', [Validators.required, coincideConLaNueva]],
  });

  constructor() {
    // La repetición se vuelve a comprobar cuando cambia la contraseña nueva.
    this.formulario.controls.nuevoPassword.valueChanges.subscribe(() =>
      this.formulario.controls.repetirPassword.updateValueAndValidity(),
    );
  }

  protected cerrarSesion(): void {
    this.auth.logout();
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    const { passwordActual, nuevoPassword } = this.formulario.getRawValue();
    this.usuarios.cambiarPasswordPropio({ passwordActual, nuevoPassword }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.snackBar.open('Contraseña cambiada. Inicia sesión de nuevo.', 'Cerrar', {
          duration: 6000,
        });
        this.auth.limpiarSesion();
        void this.router.navigate(['/login']);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }
}
