import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Cita } from '../../models';

/**
 * El comprobante de la reserva (HU-09 · RF-15: «un codigo unico que vere en
 * pantalla»).
 *
 * Se ofrece copiar el codigo, como en la contrasena provisional. La diferencia
 * es que este no se pierde al cerrar: la pantalla de disponibilidad lo conserva
 * en un aviso, porque el listado de citas propias es HU-15 y hasta entonces no
 * hay donde volver a consultarlo.
 */
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
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `,
  styles: `
    .codigo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: var(--mat-sys-surface-container-highest, #e2e2e6);
      margin-bottom: 1rem;
    }
    code {
      font-size: 1.25rem;
      letter-spacing: 0.05em;
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.35rem 1rem;
      margin: 0;
    }
    /* Ver la nota de reservar-dialogo: la opacidad no llegaba al 4.5:1 de RNF-08. */
    dt {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
    }
    dd {
      margin: 0;
    }
    /* A 360 px las dos columnas aprietan: se apilan. */
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
