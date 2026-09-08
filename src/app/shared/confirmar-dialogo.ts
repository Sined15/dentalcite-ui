import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmarDatos {
  titulo: string;
  mensaje: string;
  /** Verbo de la accion. «Dar de baja» y «Eliminar» no son lo mismo. */
  confirmar: string;
  destructivo?: boolean;
}

/** Confirmacion generica previa a una baja o una eliminacion. */
@Component({
  selector: 'app-confirmar-dialogo',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ datos.titulo }}</h2>
    <mat-dialog-content>
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
})
export class ConfirmarDialogo {
  protected readonly dialogRef = inject(MatDialogRef<ConfirmarDialogo, boolean>);
  protected readonly datos = inject<ConfirmarDatos>(MAT_DIALOG_DATA);
}
