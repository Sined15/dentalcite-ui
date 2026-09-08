import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Redirige la raiz segun el rol de la sesion. No se usa un `redirectTo` fijo
 * porque el destino depende del rol: un PACIENTE en /usuarios recibiria 403.
 */
@Component({
  selector: 'app-inicio',
  template: '',
})
export class Inicio {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    void this.router.navigateByUrl(this.auth.rutaInicial(), { replaceUrl: true });
  }
}
