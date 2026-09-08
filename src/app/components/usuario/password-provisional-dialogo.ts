import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { mensajeDeError } from '../../core/http/api-error';
import { Usuario } from '../../models';
import { UsuarioService } from '../../services/usuario.service';

/**
 * Asigna una contraseña provisional. Expulsa las sesiones activas de esa
 * cuenta y la obliga a cambiarla antes de operar.
 */
@Component({
  selector: 'app-password-provisional-dialogo',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Contraseña provisional</h2>
    <mat-dialog-content>
      <p>
        Se asignara una contraseña provisional a <strong>{{ datos.usuario.nombre }}</strong>.
        Sus sesiones activas se cerraran y debera cambiarla en el primer acceso.
      </p>
      <form [formGroup]="formulario">
        <mat-form-field appearance="outline">
          <mat-label>Nueva contraseña provisional</mat-label>
          <input matInput type="text" formControlName="password" autocomplete="off" />
          @if (formulario.controls.password.hasError('required')) {
            <mat-error>La contraseña provisional es obligatoria</mat-error>
          } @else if (formulario.controls.password.hasError('minlength')) {
            <mat-error>Debe tener al menos 8 caracteres</mat-error>
          }
        </mat-form-field>
      </form>
      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(false)">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="formulario.invalid || enviando()"
        (click)="asignar()"
      >
        Asignar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    form {
      display: flex;
      flex-direction: column;
      margin-top: 1rem;
    }
    mat-form-field {
      width: 100%;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      font-size: 0.875rem;
    }
  `,
})
export class PasswordProvisionalDialogo {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(UsuarioService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly dialogRef =
    inject<MatDialogRef<PasswordProvisionalDialogo, boolean>>(MatDialogRef);
  protected readonly datos = inject<{ usuario: Usuario }>(MAT_DIALOG_DATA);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected asignar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    this.servicio
      .asignarPasswordProvisional(this.datos.usuario.id, this.formulario.getRawValue().password)
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.snackBar.open('Contraseña provisional asignada.', 'Cerrar', { duration: 5000 });
          this.dialogRef.close(true);
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }
}
