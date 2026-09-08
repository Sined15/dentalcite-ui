import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { mensajeDeError } from '../../../core/http/api-error';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
          <mat-progress-bar mode="indeterminate" aria-label="Iniciando sesión" />
        }
        <mat-card-header>
          <mat-card-title>DentalCite</mat-card-title>
          <mat-card-subtitle>Inicia sesión para continuar</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="formulario" (ngSubmit)="enviar()">
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
              <mat-label>Contraseña</mat-label>
              <input
                matInput
                [type]="verPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="verPassword.set(!verPassword())"
                [attr.aria-label]="verPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                [attr.aria-pressed]="verPassword()"
              >
                <mat-icon>{{ verPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (formulario.controls.password.hasError('required')) {
                <mat-error>La contraseña es obligatoria</mat-error>
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
              Iniciar sesion
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <a mat-button routerLink="/registro">Registrarme como paciente</a>
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
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verPassword = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    this.auth.login(this.formulario.getRawValue()).subscribe({
      next: () => {
        this.enviando.set(false);
        // El backend bloquea todo salvo el cambio de contraseña mientras el
        // token lleve `requiere_cambio_password`.
        const destino = this.auth.requiereCambioPassword()
          ? '/cambiar-password'
          : this.auth.rutaInicial();
        void this.router.navigateByUrl(destino);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }
}
