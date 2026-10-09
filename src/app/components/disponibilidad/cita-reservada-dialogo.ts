import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Cita } from '../../models';

@Component({
  selector: 'app-cita-reservada-dialogo',
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Cita reservada</h2>
    <mat-dialog-content>
      <p>Guarda este código: lo necesitarás en recepción.</p>

      <div class="codigo">
        <code>{{ cita.codigo }}</code>
        <button
          mat-icon-button
          type="button"
          (click)="copiar()"
          [attr.aria-label]="'Copiar el código ' + cita.codigo"
        >
          <mat-icon>{{ copiado() ? 'check' : 'content_copy' }}</mat-icon>
        </button>
      </div>

      <dl>
        <dt>Tratamiento</dt>
        <dd>{{ cita.tratamiento.nombre }} · {{ cita.duracionMinutos }} min</dd>

        <dt>Cuándo</dt>
        <dd>{{ cita.fecha | date: "EEEE d 'de' MMMM" }}, {{ cita.hora.slice(0, 5) }}</dd>

        <dt>Odontólogo</dt>
        <dd>{{ cita.odontologo.nombre }}</dd>

        <dt>Consultorio</dt>
        <dd>{{ cita.consultorio.nombre }}</dd>
      </dl>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `,
  styles: `
    .codigo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      background: var(--surface-sunken);
      margin-bottom: var(--space-4);
    }
    code {
      font: 600 1.375rem/1.75rem var(--font-mono);
      letter-spacing: 0.04em;
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--space-2) var(--space-5);
      margin: 0;
    }
    dt {
      font: var(--text-label);
      color: var(--ink-muted);
    }
    dd {
      margin: 0;
    }
    @media (max-width: 26rem) {
      dl {
        grid-template-columns: 1fr;
        gap: 0 0;
      }
      dd {
        margin-bottom: 0.5rem;
      }
    }
  `,
})
export class CitaReservadaDialogo {
  protected readonly cita = inject<Cita>(MAT_DIALOG_DATA);
  protected readonly copiado = signal(false);

  protected copiar(): void {
    navigator.clipboard?.writeText(this.cita.codigo).then(
      () => this.copiado.set(true),
      () => this.copiado.set(false),
    );
  }
}
