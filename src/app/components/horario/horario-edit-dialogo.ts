import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensajeDeError } from '../../core/http/api-error';
import { DIAS_SEMANA, Horario } from '../../models';
import { HorarioService } from '../../services/horario.service';

export interface HorarioDialogoDatos {
  odontologoId: string;
  horario: Horario | null;
}

/**
 * Alta y edicion de un tramo de horario.
 *
 * `horaInicio` y `horaFin` son `LocalTime`: viajan como cadena "HH:mm" o
 * "HH:mm:ss", sin fecha ni zona. El input nativo `type="time"` produce ya ese
 * formato, asi que no interviene ningun `Date`.
 */
@Component({
  selector: 'app-horario-edit-dialogo',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ datos.horario ? 'Editar tramo' : 'Nuevo tramo' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="formulario">
        <mat-form-field appearance="outline">
          <mat-label>Dia de la semana</mat-label>
          <mat-select formControlName="diaSemana">
            @for (dia of dias; track dia.valor) {
              <mat-option [value]="dia.valor">{{ dia.nombre }}</mat-option>
            }
          </mat-select>
          @if (formulario.controls.diaSemana.hasError('required')) {
            <mat-error>El día de la semana es obligatorio</mat-error>
          }
        </mat-form-field>

        <div class="fila">
          <mat-form-field appearance="outline">
            <mat-label>Hora de inicio</mat-label>
            <input matInput type="time" formControlName="horaInicio" step="60" />
            @if (formulario.controls.horaInicio.hasError('required')) {
              <mat-error>La hora de inicio es obligatoria</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hora de fin</mat-label>
            <input matInput type="time" formControlName="horaFin" step="60" />
            @if (formulario.controls.horaFin.hasError('required')) {
              <mat-error>La hora de fin es obligatoria</mat-error>
            }
          </mat-form-field>
        </div>

        @if (formulario.hasError('rangoInvalido')) {
          <p class="error" role="alert">La hora de inicio debe ser anterior a la de fin (RN-03)</p>
        }

        @if (error(); as mensaje) {
          <p class="error" role="alert">{{ mensaje }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(false)">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="formulario.invalid || enviando()"
        (click)="guardar()"
      >
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: min(100%, 22rem);
    }
    .fila {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .fila mat-form-field {
      flex: 1 1 8rem;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      font-size: 0.875rem;
      margin: 0;
    }
  `,
})
export class HorarioEditDialogo {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(HorarioService);

  protected readonly dialogRef = inject<MatDialogRef<HorarioEditDialogo, boolean>>(MatDialogRef);
  protected readonly datos = inject<HorarioDialogoDatos>(MAT_DIALOG_DATA);

  protected readonly dias = DIAS_SEMANA;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group(
    {
      diaSemana: [this.datos.horario?.diaSemana ?? 1, [Validators.required]],
      horaInicio: [recortar(this.datos.horario?.horaInicio) || '09:00', [Validators.required]],
      horaFin: [recortar(this.datos.horario?.horaFin) || '13:00', [Validators.required]],
    },
    {
      // RN-03. El servicio tambien lo valida, pero avisar antes de enviar
      // ahorra un 400 innecesario.
      validators: (grupo) => {
        const inicio = grupo.get('horaInicio')?.value as string;
        const fin = grupo.get('horaFin')?.value as string;
        return inicio && fin && inicio >= fin ? { rangoInvalido: true } : null;
      },
    },
  );

  protected guardar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    const cuerpo = this.formulario.getRawValue();
    const peticion = this.datos.horario
      ? this.servicio.reemplazar(this.datos.odontologoId, this.datos.horario.id, cuerpo)
      : this.servicio.crear(this.datos.odontologoId, cuerpo);

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        // Un 409 significa solape con otro tramo ya declarado.
        this.error.set(mensajeDeError(err));
      },
    });
  }
}

/** "09:00:00" -> "09:00", que es lo que espera `input[type=time]`. */
function recortar(hora: string | undefined): string {
  return hora ? hora.slice(0, 5) : '';
}
