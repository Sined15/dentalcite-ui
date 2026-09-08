import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

/**
 * Muestra la contraseña provisional que devolvio el alta.
 *
 * Es el unico instante en que existe fuera del hash: el backend no la vuelve a
 * exponer en ninguna lectura posterior. Por eso se muestra una vez, se ofrece
 * copiarla, y no se guarda en ningun almacenamiento del cliente.
 */
@Component({
  selector: 'app-password-generada-dialogo',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Cuenta creada</h2>
    <mat-dialog-content>
      <p>
        Entrega esta contraseña provisional a <strong>{{ datos.nombre }}</strong>. No volvera a
        mostrarse: el sistema solo conserva su hash.
      </p>
      <div class="clave">
        <code>{{ datos.password }}</code>
        <button
          mat-icon-button
          type="button"
          (click)="copiar()"
          aria-label="Copiar la contraseña provisional"
        >
          <mat-icon>{{ copiada() ? 'check' : 'content_copy' }}</mat-icon>
        </button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `,
  styles: `
    .clave {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: var(--mat-sys-surface-container-highest, #e2e2e6);
    }
    code {
      font-size: 1.05rem;
      letter-spacing: 0.05em;
      word-break: break-all;
    }
  `,
})
export class PasswordGeneradaDialogo {
  protected readonly datos = inject<{ nombre: string; password: string }>(MAT_DIALOG_DATA);
  protected readonly copiada = signal(false);

  protected copiar(): void {
    navigator.clipboard?.writeText(this.datos.password).then(
      () => this.copiada.set(true),
      () => this.copiada.set(false),
    );
  }
}
