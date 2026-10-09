import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmarDatos {
  titulo: string;
  mensaje: string;
  confirmar: string;
  destructivo?: boolean;
  /** Icono del sello; por defecto `archive` si es destructivo (baja lógica) y `help` si no. */
  icono?: string;
  /** Qué se va a afectar: nombre y, si hay, una segunda línea de contexto. */
  resumen?: { nombre: string; detalle?: string };
}

@Component({
  selector: 'app-confirmar-dialogo',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="cabecera-dialogo">
      <span class="sello" [class.sello--peligro]="datos.destructivo" aria-hidden="true">
        <mat-icon>{{ datos.icono ?? (datos.destructivo ? 'archive' : 'help') }}</mat-icon>
      </span>
      <h2 mat-dialog-title>{{ datos.titulo }}</h2>
    </div>
    <mat-dialog-content>
      @if (datos.resumen; as resumen) {
        <p class="dc-resumen">
          <span>
            <strong>{{ resumen.nombre }}</strong>
            @if (resumen.detalle) {
              <br />
              {{ resumen.detalle }}
            }
          </span>
        </p>
      }
      <p>{{ datos.mensaje }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(false)">Cancelar</button>
      <button
        mat-flat-button
        type="button"
        [color]="datos.destructivo ? 'warn' : 'primary'"
        (click)="dialogRef.close(true)"
      >
        {{ datos.confirmar }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .cabecera-dialogo {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding-inline-end: var(--space-6);
    }
    .cabecera-dialogo h2 {
      padding-inline: 0;
    }
    .sello {
      width: 2.5rem;
      height: 2.5rem;
      flex: none;
      margin-inline-start: var(--space-6);
      display: grid;
      place-items: center;
      border-radius: var(--radius-sm);
      background: var(--brand-soft);
      color: var(--brand-ink);
    }
    .sello--peligro {
      background: var(--surface-sunken);
      color: var(--danger-ink);
    }
    p {
      margin: 0;
    }
    .dc-resumen {
      margin-bottom: var(--space-4);
    }
  `,
})
export class ConfirmarDialogo {
  protected readonly dialogRef = inject(MatDialogRef<ConfirmarDialogo, boolean>);
  protected readonly datos = inject<ConfirmarDatos>(MAT_DIALOG_DATA);
}
