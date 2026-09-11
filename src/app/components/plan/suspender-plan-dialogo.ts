import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../core/http/api-error';
import { Plan } from '../../models';
import { PlanService } from '../../services/plan.service';

export interface SuspenderPlanDatos {
  plan: Plan;
}

/**
 * Suspensión de un plan de tratamiento (HU-17 · RF-23 · RN-12).
 *
 * <p>No reutiliza `ConfirmarDialogo` por el mismo motivo que `CancelarDialogo`:
 * aquí no basta con decir que sí, hay que decir <strong>por qué</strong>. El
 * motivo queda en el registro del plan, que RN-12 conserva, y el botón no se
 * habilita sin él para que el 400 del servidor sea la red y no el camino normal.
 *
 * <p>Dice también lo que la suspensión hace posible: que ese tratamiento vuelva
 * a poder planificarse. Es el efecto que el odontólogo busca cuando quiere
 * replantear un plan, y no verlo escrito obliga a deducirlo.
 */
@Component({
  selector: 'app-suspender-plan-dialogo',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Suspender el plan</h2>
    <mat-dialog-content>
      <p class="resumen">
        <strong>{{ datos.plan.tratamiento.nombre }}</strong> ·
        {{ datos.plan.sesionesPrevistas }}
        {{ datos.plan.sesionesPrevistas === 1 ? 'sesión' : 'sesiones' }}<br />
        {{ datos.plan.paciente.nombre }} · planificado por {{ datos.plan.odontologo.nombre }}
      </p>

      <mat-form-field appearance="outline" class="motivo">
        <mat-label>Motivo de la suspensión</mat-label>
        <textarea
          matInput
          rows="3"
          maxlength="255"
          required
          [(ngModel)]="motivo"
          name="motivo"
          [disabled]="enviando()"
        ></textarea>
        <mat-hint>Queda registrado en el plan, que se conserva.</mat-hint>
      </mat-form-field>

      <p class="aviso">
        El plan dejará de estar activo pero no se borra, y este tratamiento podrá volver a
        planificarse.
      </p>

      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" [disabled]="enviando()" (click)="cerrar()">Volver</button>
      <button
        mat-flat-button
        color="warn"
        type="button"
        [disabled]="!motivo.trim() || enviando()"
        (click)="suspender()"
      >
        Suspender
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .resumen {
      margin: 0 0 1rem;
      line-height: 1.5;
    }
    .motivo {
      width: 100%;
    }
    /* Color propio en vez de opacidad: al 75 % el contraste caía por debajo del
       4.5:1 que exige RNF-08. */
    .aviso {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      font-size: 0.875rem;
      margin: 0.75rem 0 0;
    }
  `,
})
export class SuspenderPlanDialogo {
  private readonly servicio = inject(PlanService);
  private readonly dialogRef = inject<MatDialogRef<SuspenderPlanDialogo, Plan | null>>(MatDialogRef);
  protected readonly datos = inject<SuspenderPlanDatos>(MAT_DIALOG_DATA);

  protected motivo = '';
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected cerrar(): void {
    this.dialogRef.close(null);
  }

  protected suspender(): void {
    const motivo = this.motivo.trim();
    if (!motivo || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    this.servicio.suspender(this.datos.plan.id, motivo).subscribe({
      next: (plan) => {
        this.enviando.set(false);
        this.dialogRef.close(plan);
      },
      error: (err: unknown) => {
        // El 409 —ya estaba suspendido— y el 403 —lo creó otro odontólogo— se
        // muestran aquí y no cierran el diálogo: quien opera necesita leer por
        // qué no se pudo.
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
