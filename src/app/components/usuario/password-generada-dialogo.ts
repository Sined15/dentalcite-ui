import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-password-generada-dialogo',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Cuenta creada</h2>
    <mat-dialog-content>
      <p>
        Entrega esta contraseña provisional a <strong>{{ datos.nombre }}</strong>.
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
      <p class="dc-aviso dc-aviso--advertencia">
        <mat-icon aria-hidden="true">warning</mat-icon>
        <span>
          No volverá a mostrarse: el sistema solo conserva su hash. La persona la cambiará al
          entrar por primera vez.
        </span>
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `,
  styles: `
    .clave {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      background: var(--surface-sunken);
    }
    code {
      font: 600 1.25rem/1.75rem var(--font-mono);
      letter-spacing: 0.04em;
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
