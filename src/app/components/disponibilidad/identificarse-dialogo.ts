import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

export interface IdentificarseDialogoDatos {
  /** La consulta con la franja elegida, para volver a ella después de entrar. */
  returnUrl: string;
}

/**
 * Lo que ve el visitante al pulsar una franja: para reservarla hace falta una
 * cuenta, y se le ofrecen los dos caminos.
 *
 * Los dos llevan el `returnUrl` con la consulta y la hora elegidas. Así, entre
 * por el login o pase antes por el registro, termina otra vez delante de esa
 * franja, sin volver a elegir tratamiento, día ni hora.
 */
@Component({
  selector: 'app-identificarse-dialogo',
  imports: [MatButtonModule, MatDialogModule, RouterLink],
  template: `
    <h2 mat-dialog-title>Inicia sesión para reservar</h2>
    <mat-dialog-content>
      <p>
        Para reservar esta franja necesitas una cuenta. Al entrar volverás aquí, con la misma
        hora elegida.
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
        color="primary"
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
    p {
      margin: 0;
    }
    /* A 360 px los tres botones no caben en una fila: se reparten. */
    mat-dialog-actions {
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `,
})
export class IdentificarseDialogo {
  protected readonly datos = inject<IdentificarseDialogoDatos>(MAT_DIALOG_DATA);
}
