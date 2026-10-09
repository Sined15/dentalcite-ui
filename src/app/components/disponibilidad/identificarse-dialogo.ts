import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

export interface FranjaElegida {
  tratamiento: string;
  fecha: string;
  hora: string;
  odontologo: string;
}

export interface IdentificarseDialogoDatos {
  returnUrl: string;
  franja?: FranjaElegida;
}

@Component({
  selector: 'app-identificarse-dialogo',
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule, RouterLink],
  template: `
    <div class="cabecera-dialogo">
      <span class="sello" aria-hidden="true"><mat-icon>person</mat-icon></span>
      <h2 mat-dialog-title>Inicia sesión para reservar</h2>
    </div>
    <mat-dialog-content>
      <p>
        Para reservar esta franja necesitas una cuenta; ver la clínica, no. Si no tienes una,
        crearla lleva un minuto.
      </p>
      @if (datos.franja; as franja) {
        <p class="dc-resumen">
          <mat-icon aria-hidden="true">event</mat-icon>
          <span>
            {{ franja.fecha | date: "EEEE d 'de' MMMM" }} a las {{ franja.hora }} ·
            {{ franja.tratamiento }} · {{ franja.odontologo }}
          </span>
        </p>
      }
      <p class="dc-aviso">
        <mat-icon aria-hidden="true">keyboard_return</mat-icon>
        <span>Al entrar volverás aquí, con la misma hora elegida.</span>
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Seguir mirando</button>
      <a
        mat-stroked-button
        routerLink="/registro"
        [queryParams]="{ returnUrl: datos.returnUrl }"
        mat-dialog-close
      >
        Crear cuenta
      </a>
      <a
        mat-flat-button
        routerLink="/login"
        [queryParams]="{ returnUrl: datos.returnUrl }"
        mat-dialog-close
        cdkFocusInitial
      >
        Iniciar sesión
      </a>
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
    p {
      margin: 0;
    }
    .dc-resumen {
      margin-top: var(--space-4);
    }
    mat-dialog-actions {
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `,
})
export class IdentificarseDialogo {
  protected readonly datos = inject<IdentificarseDialogoDatos>(MAT_DIALOG_DATA);
}
