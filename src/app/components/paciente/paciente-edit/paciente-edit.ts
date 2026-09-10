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
import { Router } from '@angular/router';
import { mensajeDeError } from '../../../core/http/api-error';
import { TIPOS_DOCUMENTO, TipoDocumento } from '../../../models';
import { PacienteService } from '../../../services/paciente.service';

/** Version del texto que se registra con el alta (RNF-06), como en el portal. */
const VERSION_CONSENTIMIENTO = '1.0';

/**
 * HU-12 · Alta presencial del paciente, para RECEPCIONISTA y ADMINISTRADOR.
 *
 * Es el formulario de registro del portal menos el correo y la contraseña: el
 * criterio dice «sin credenciales de acceso». Lo que sí conserva es la casilla
 * del consentimiento, que aquí la recepcionista marca en nombre del titular que
 * lo firma en el mostrador (RNF-06).
 */
@Component({
  selector: 'app-paciente-edit',
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
    <h1>Registrar paciente presencial</h1>
    <p class="ayuda">
      Crea la ficha de quien se atiende en la clínica sin pedirle que abra una cuenta. Si más
      adelante se registra en el portal con el mismo documento, se le vinculará esta misma ficha.
    </p>

    <mat-card class="tarjeta">
      @if (enviando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Registrando al paciente" />
      }
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
            <mat-label>Teléfono (opcional)</mat-label>
            <input matInput formControlName="telefono" />
          </mat-form-field>

          <mat-checkbox formControlName="consentimientoAceptado">
            El paciente ha firmado el consentimiento informado de tratamiento de datos (versión
            {{ versionConsentimiento }})
          </mat-checkbox>
          @if (
            formulario.controls.consentimientoAceptado.touched &&
            formulario.controls.consentimientoAceptado.hasError('requiredTrue')
          ) {
            <p class="error" role="alert">
              Sin el consentimiento del titular no se puede registrar la ficha
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
              [disabled]="formulario.invalid || enviando()"
            >
              Registrar
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    h1 {
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
    }
    .ayuda {
      margin: 0 0 1rem;
      max-width: 44rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
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
      margin: 0.5rem 0 0;
    }
  `,
})
export class PacienteEdit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly tiposDocumento = TIPOS_DOCUMENTO;
  protected readonly versionConsentimiento = VERSION_CONSENTIMIENTO;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    tipoDocumento: ['DNI' as TipoDocumento, [Validators.required]],
    documento: ['', [Validators.required]],
    telefono: [''],
    // El servidor lo exige con @AssertTrue: sin marcar responde 400 (RNF-06).
    consentimientoAceptado: [false, [Validators.requiredTrue]],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();
    this.servicio
      .crear({
        ...valores,
        telefono: valores.telefono || undefined,
        versionConsentimiento: VERSION_CONSENTIMIENTO,
      })
      .subscribe({
        next: (paciente) => {
          this.enviando.set(false);
          // El numero de historia es lo que la recepcionista necesita leerle al
          // paciente, asi que se muestra en vez de un «guardado» generico.
          this.snackBar.open(
            `Paciente registrado con la historia clínica ${paciente.numeroHistoria}.`,
            'Cerrar',
            { duration: 8000 },
          );
          this.formulario.reset({ tipoDocumento: 'DNI', consentimientoAceptado: false });
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected cancelar(): void {
    void this.router.navigate(['/']);
  }
}
