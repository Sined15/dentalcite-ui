import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { mensajeDeError } from '../../../core/http/api-error';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-cambiar-password',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="pantalla-acceso">
      <mat-card class="tarjeta">
        @if (enviando()) {
          <mat-progress-bar mode="indeterminate" aria-label="Cambiando contraseña" />
        }
        <mat-card-header>
          <mat-card-title>Cambiar contraseña</mat-card-title>
          @if (esObligatorio()) {
            <mat-card-subtitle>
              Tu cuenta usa una contraseña provisional. Debes cambiarla antes de continuar.
            </mat-card-subtitle>
          }
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="formulario" (ngSubmit)="enviar()">
            <mat-form-field appearance="outline">
              <mat-label>Contraseña actual</mat-label>
              <input
                matInput
                type="password"
                formControlName="passwordActual"
                autocomplete="current-password"
              />
              @if (formulario.controls.passwordActual.hasError('required')) {
                <mat-error>La contraseña actual es obligatoria</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Nueva contraseña</mat-label>
              <input
                matInput
                type="password"
                formControlName="nuevoPassword"
                autocomplete="new-password"
              />
              @if (formulario.controls.nuevoPassword.hasError('required')) {
                <mat-error>La nueva contraseña es obligatoria</mat-error>
              } @else if (formulario.controls.nuevoPassword.hasError('minlength')) {
                <mat-error>Debe tener al menos 8 caracteres</mat-error>
              }
            </mat-form-field>

            @if (error(); as mensaje) {
              <p class="error" role="alert">{{ mensaje }}</p>
            }

            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="formulario.invalid || enviando()"
            >
              Cambiar contraseña
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
      background: var(--mat-sys-surface-container-low, #f4f4f7);
    }
    .tarjeta {
      width: 100%;
      max-width: 26rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 1rem;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      margin: 0 0 1rem;
      font-size: 0.875rem;
    }
    button[type='submit'] {
      margin-top: 0.5rem;
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

  protected readonly formulario = this.fb.nonNullable.group({
    passwordActual: ['', [Validators.required]],
    nuevoPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    this.usuarios.cambiarPasswordPropio(this.formulario.getRawValue()).subscribe({
      next: () => {
        this.enviando.set(false);
        // Cambiar la contraseña adelanta `tokensValidosDesde`, asi que el
        // backend acaba de revocar este token: hay que volver a entrar.
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
