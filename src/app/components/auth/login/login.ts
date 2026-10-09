import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { mensajeDeError } from '../../../core/http/api-error';

/** Lo que dura el bloqueo del servidor tras tres intentos fallidos. */
const BLOQUEO_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <header class="barra">
      <div class="dc-container barra-interior">
        <a class="marca" routerLink="/" aria-label="DentalCite, ir a inicio">
          <span class="sello" aria-hidden="true"><mat-icon>medical_services</mat-icon></span>
          <span>Dental<b>Cite</b></span>
        </a>
        <a mat-button routerLink="/" class="volver">
          <mat-icon aria-hidden="true">home</mat-icon>
          <span>Seguir mirando la clínica</span>
        </a>
      </div>
    </header>

    <main class="dc-container escena">
      <section class="tarjeta" aria-labelledby="titulo-login">
        @if (enviando()) {
          <mat-progress-bar mode="indeterminate" aria-label="Iniciando sesión" />
        }
        <div>
          <h1 id="titulo-login">Inicia sesión</h1>
          <p class="subtitulo">Para reservar necesitas una cuenta; ver la clínica, no.</p>
        </div>

        @if (destinoPedido()) {
          <p class="dc-aviso">
            <mat-icon aria-hidden="true">keyboard_return</mat-icon>
            <span>Al entrar volverás a la franja que elegiste, con la misma hora.</span>
          </p>
        }

        <form [formGroup]="formulario" (ngSubmit)="enviar()" aria-label="Inicio de sesión">
          @if (bloqueada()) {
            <p class="dc-aviso dc-aviso--advertencia" role="alert">
              <mat-icon aria-hidden="true">lock</mat-icon>
              <span>
                <strong>Cuenta bloqueada por cinco minutos</strong>
                Hubo tres intentos fallidos seguidos. Lo hacemos para proteger tu historia
                clínica. Podrás volver a intentarlo pasado ese tiempo.
              </span>
            </p>
          } @else if (error(); as mensaje) {
            <p class="dc-aviso dc-aviso--error" role="alert">
              <mat-icon aria-hidden="true">error</mat-icon>
              <span>
                <strong>No pudimos iniciar sesión</strong>
                {{ mensaje }}
              </span>
            </p>
          }

          <mat-form-field appearance="outline">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="correo" autocomplete="username" />
            @if (formulario.controls.correo.hasError('required')) {
              <mat-error>El correo es obligatorio</mat-error>
            } @else if (formulario.controls.correo.hasError('email')) {
              <mat-error>Escribe un correo electrónico válido</mat-error>
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
            } @else {
              <mat-hint>
                Tras tres intentos fallidos, la cuenta se bloquea cinco minutos para protegerla.
              </mat-hint>
            }
          </mat-form-field>

          <button
            mat-flat-button
            type="submit"
            [disabled]="formulario.invalid || enviando() || bloqueada()"
            [attr.aria-describedby]="bloqueada() ? 'por-que-bloqueada' : null"
          >
            Iniciar sesión
          </button>
          @if (bloqueada()) {
            <p class="ayuda" id="por-que-bloqueada">
              Se activa cuando termine el bloqueo. Mientras tanto, puedes seguir mirando la
              clínica.
            </p>
          }
        </form>

        <p class="pie">
          ¿Aún no tienes cuenta?
          <a routerLink="/registro" [queryParams]="{ returnUrl: destinoPedido() }"
            >Regístrate como paciente</a
          >
        </p>
      </section>

      <aside class="lateral" aria-labelledby="titulo-lateral">
        <h2 id="titulo-lateral">Al entrar</h2>
        <ul>
          <li>
            <mat-icon aria-hidden="true">keyboard_return</mat-icon>
            <span>
              <strong>Vuelves donde estabas</strong>
              Si venías de elegir una hora, te llevamos a esa misma franja.
            </span>
          </li>
          <li>
            <mat-icon aria-hidden="true">vpn_key</mat-icon>
            <span>
              <strong>Si tu contraseña es provisional</strong>
              Te pediremos cambiarla antes de hacer cualquier otra cosa.
            </span>
          </li>
          <li>
            <mat-icon aria-hidden="true">lock</mat-icon>
            <span>
              <strong>Tu cuenta se cuida sola</strong>
              Cerrar sesión desactiva el acceso en todos tus dispositivos.
            </span>
          </li>
        </ul>
      </aside>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: var(--surface-page);
    }
    .barra {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .barra-interior {
      height: var(--layout-navbar);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .marca {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
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
    .escena {
      display: grid;
      grid-template-columns: minmax(0, var(--layout-form)) minmax(0, 20rem);
      gap: var(--space-10);
      justify-content: center;
      align-items: start;
      padding-block: var(--space-12) var(--space-16);
    }
    .tarjeta {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding: var(--space-8);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
    }
    h1 {
      margin: 0;
      font: var(--text-display-sm);
      letter-spacing: -0.01em;
    }
    .subtitulo {
      margin: var(--space-2) 0 0;
      color: var(--ink-muted);
    }
    .tarjeta .dc-aviso {
      margin: 0;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    form .dc-aviso {
      margin-bottom: var(--space-4);
    }
    .dc-aviso strong {
      display: block;
      font: var(--text-label);
      margin-bottom: 2px;
    }
    button[type='submit'] {
      margin-top: var(--space-2);
      min-height: 3rem;
    }
    .ayuda {
      margin: var(--space-2) 0 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .pie {
      margin: 0;
      text-align: center;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .pie a {
      color: var(--accent-ink);
      text-decoration: underline;
    }
    .lateral {
      padding-top: var(--space-4);
    }
    .lateral h2 {
      margin: 0 0 var(--space-5);
      font: var(--text-title-md);
    }
    .lateral ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-4);
    }
    .lateral li {
      display: flex;
      gap: var(--space-3);
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .lateral li mat-icon {
      flex: none;
      color: var(--brand-ink);
    }
    .lateral li strong {
      display: block;
      color: var(--ink);
      font: var(--text-label);
      margin-bottom: 2px;
    }
    @media (max-width: 60rem) {
      .escena {
        grid-template-columns: minmax(0, var(--layout-form));
        padding-block: var(--space-8) var(--space-12);
      }
      .lateral {
        order: 2;
        padding-top: 0;
      }
    }
    @media (max-width: 37.5rem) {
      .tarjeta {
        padding: var(--space-5);
        box-shadow: none;
      }
      .volver span {
        display: none;
      }
    }
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly bloqueada = signal(false);
  protected readonly verPassword = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.soltarTemporizador());
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando() || this.bloqueada()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    this.auth.login(this.formulario.getRawValue()).subscribe({
      next: () => {
        this.enviando.set(false);
        const destino = this.auth.requiereCambioPassword()
          ? '/cambiar-password'
          : (this.destinoPedido() ?? this.auth.rutaInicial());
        void this.router.navigateByUrl(destino);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.mostrarFallo(err);
      },
    });
  }

  protected destinoPedido(): string | null {
    const destino = this.ruta.snapshot.queryParamMap.get('returnUrl');
    if (!destino || !/^\/(?![/\\])/.test(destino)) {
      return null;
    }
    return destino;
  }

  private mostrarFallo(err: unknown): void {
    const estado = err instanceof HttpErrorResponse ? err.status : null;
    if (estado === 423) {
      this.bloquear();
      return;
    }
    this.error.set(
      estado === 401
        ? 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.'
        : mensajeDeError(err),
    );
  }

  /** Apaga el botón mientras dure el bloqueo del servidor; el aviso explica por qué. */
  private bloquear(): void {
    this.soltarTemporizador();
    this.bloqueada.set(true);
    this.temporizador = setTimeout(() => this.bloqueada.set(false), BLOQUEO_MS);
  }

  private soltarTemporizador(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
