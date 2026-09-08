import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../../models';
import { AuthService } from './auth.service';

/**
 * Restringe una ruta a un conjunto de roles, declarados en `data.roles`.
 *
 * Sin sesion va al login; con sesion y rol insuficiente va a `/sin-permiso`.
 * Son situaciones distintas y confundirlas desorienta al usuario.
 */
export const rolGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaAutenticado()) {
    return router.createUrlTree(['/login']);
  }

  const permitidos = (route.data['roles'] as Rol[] | undefined) ?? [];
  if (permitidos.length === 0) {
    return true;
  }

  const rol = auth.rol();
  return rol && permitidos.includes(rol) ? true : router.createUrlTree(['/sin-permiso']);
};
