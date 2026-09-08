import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Destino del `rolGuard` cuando hay sesion pero el rol no alcanza. Es distinto
 * de no tener sesion, y mandar al login en este caso confundiria al usuario.
 */
@Component({
  selector: 'app-sin-permiso',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="pantalla-acceso">
      <mat-card class="tarjeta">
        <mat-card-content>
          <mat-icon class="icono" aria-hidden="true">lock</mat-icon>
          <h1>Sin permiso</h1>
          <p>
            Tu rol ({{ rol() ?? 'sin definir' }}) no tiene acceso a esta seccion.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-flat-button color="primary" type="button" (click)="volver()">
            Volver al inicio
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: `
    .pantalla-acceso {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60dvh;
      padding: 1rem;
    }
    .tarjeta {
      max-width: 26rem;
      text-align: center;
    }
    .icono {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      margin-top: 1rem;
    }
    h1 {
      font-size: 1.25rem;
      margin: 0.5rem 0;
    }
  `,
})
export class SinPermiso {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly rol = this.auth.rol;

  protected volver(): void {
    void this.router.navigateByUrl(this.auth.rutaInicial());
  }
}
