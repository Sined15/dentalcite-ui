import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../core/http/api-error';
import { Plan } from '../../models';
import { PlanService } from '../../services/plan.service';

export interface SuspenderPlanDatos {
  plan: Plan;
}

@Component({
  selector: 'app-suspender-plan-dialogo',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Suspender el plan</h2>
    <mat-dialog-content>
      <p class="dc-resumen">
        <mat-icon aria-hidden="true">assignment</mat-icon>
        <span>
          <strong>{{ datos.plan.tratamiento.nombre }}</strong> ·
          {{ datos.plan.sesionesPrevistas }}
          {{ datos.plan.sesionesPrevistas === 1 ? 'sesión' : 'sesiones' }}<br />
          {{ datos.plan.paciente.nombre }} · planificado por {{ datos.plan.odontologo.nombre }}
        </span>
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

      <p class="dc-aviso dc-aviso--advertencia">
        <mat-icon aria-hidden="true">warning</mat-icon>
        <span>
          El plan dejará de estar activo pero no se borra, y este tratamiento podrá volver a
          planificarse.
        </span>
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
    .motivo {
      width: 100%;
    }
    .error {
      color: var(--danger-ink);
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
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
