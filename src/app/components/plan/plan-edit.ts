import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import { Odontologo, Plan, Tratamiento } from '../../models';
import { OdontologoService } from '../../services/odontologo.service';
import { PlanService } from '../../services/plan.service';
import { TratamientoService } from '../../services/tratamiento.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';

export interface PlanEditDatos {
  /** Ficha del paciente al que se le planifica. */
  pacienteId: string;
  pacienteNombre: string;
}

/**
 * Alta de un plan de tratamiento (HU-17 · RF-23).
 *
 * <p>Es un diálogo y no una pantalla porque se decide desde la ficha del
 * paciente, que es donde el odontólogo ya está mirando cuando planifica: sacarlo
 * a una ruta propia obligaría a volver a elegir al paciente que ya tenía
 * delante.
 *
 * <p>El selector de odontólogo solo se pinta para el ADMINISTRADOR. El
 * ODONTOLOGO planifica en su propio nombre, y el servidor le responde 403 si
 * manda el campo aunque sea el suyo.
 */
@Component({
  selector: 'app-plan-edit',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Nuevo plan de tratamiento</h2>
    <mat-dialog-content>
      <p class="resumen">
        Para <strong>{{ datos.pacienteNombre }}</strong>
      </p>

      <form [formGroup]="formulario">
        @if (planificaParaOtro()) {
          <mat-form-field appearance="outline">
            <mat-label>Odontólogo</mat-label>
            <mat-select formControlName="odontologoId">
              @for (odo of odontologos(); track odo.id) {
                <mat-option [value]="odo.id">{{ odo.nombres }} {{ odo.apellidos }}</mat-option>
              }
            </mat-select>
            <mat-hint>Quién firma la indicación.</mat-hint>
            @if (formulario.controls.odontologoId.hasError('required')) {
              <mat-error>Debes indicar el odontólogo que planifica</mat-error>
            }
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Tratamiento</mat-label>
          <mat-select formControlName="tratamientoId">
            @for (tra of tratamientos(); track tra.id) {
              <mat-option [value]="tra.id">{{ tra.nombre }}</mat-option>
            }
          </mat-select>
          @if (formulario.controls.tratamientoId.hasError('required')) {
            <mat-error>Debes elegir un tratamiento</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Sesiones previstas</mat-label>
          <input matInput type="number" min="1" max="60" formControlName="sesionesPrevistas" />
          <mat-hint>
            En cuántas sesiones se dividirá. El paciente lo sabrá desde el principio.
          </mat-hint>
          @if (formulario.controls.sesionesPrevistas.hasError('required')) {
            <mat-error>El número de sesiones es obligatorio</mat-error>
          }
          @if (formulario.controls.sesionesPrevistas.hasError('min')) {
            <mat-error>El plan debe tener al menos una sesión</mat-error>
          }
        </mat-form-field>
      </form>

      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" [disabled]="enviando()" (click)="cerrar()">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="formulario.invalid || enviando()"
        (click)="guardar()"
      >
        Crear el plan
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .resumen {
      margin: 0 0 1rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: min(22rem, 70vw);
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      font-size: 0.875rem;
      margin: 0.75rem 0 0;
    }
  `,
})
export class PlanEdit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(PlanService);
  private readonly tratamientoService = inject(TratamientoService);
  private readonly odontologoService = inject(OdontologoService);
  private readonly auth = inject(AuthService);

  protected readonly dialogRef = inject<MatDialogRef<PlanEdit, Plan | null>>(MatDialogRef);
  protected readonly datos = inject<PlanEditDatos>(MAT_DIALOG_DATA);

  /** Solo el administrador planifica a nombre de otro profesional. */
  protected readonly planificaParaOtro = computed(() => this.auth.rol() === 'ADMINISTRADOR');

  protected readonly tratamientos = signal<Tratamiento[]>([]);
  protected readonly odontologos = signal<Odontologo[]>([]);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    odontologoId: [''],
    tratamientoId: ['', [Validators.required]],
    sesionesPrevistas: [1, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    cargarTodasLasPaginas((pagina) =>
      this.tratamientoService.listar({ page: pagina, size: 100 }),
    ).subscribe({
      next: (lista) => this.tratamientos.set(lista.filter((t) => t.activo)),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

    if (this.planificaParaOtro()) {
      // El campo solo es obligatorio para quien lo ve: el odontólogo no lo manda.
      this.formulario.controls.odontologoId.addValidators(Validators.required);
      cargarTodasLasPaginas((pagina) =>
        this.odontologoService.listar({ page: pagina, size: 100 }),
      ).subscribe({
        next: (lista) => this.odontologos.set(lista.filter((o) => o.activo)),
        error: (err: unknown) => this.error.set(mensajeDeError(err)),
      });
    }
  }

  protected cerrar(): void {
    this.dialogRef.close(null);
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();
    this.servicio
      .crear({
        pacienteId: this.datos.pacienteId,
        tratamientoId: valores.tratamientoId,
        sesionesPrevistas: valores.sesionesPrevistas,
        // Ausente, no vacío: el servidor responde 403 a un ODONTOLOGO que lo
        // mande, aunque sea su propio registro.
        ...(this.planificaParaOtro() ? { odontologoId: valores.odontologoId } : {}),
      })
      .subscribe({
        next: (plan) => {
          this.enviando.set(false);
          this.dialogRef.close(plan);
        },
        error: (err: unknown) => {
          // El 409 de RN-13 se muestra aquí y no cierra el diálogo: dice que hay
          // que suspender el plan en curso, y quien planifica necesita leerlo.
          this.enviando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }
}
