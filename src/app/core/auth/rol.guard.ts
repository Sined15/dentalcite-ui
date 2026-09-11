import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../../models';
import { AuthService } from './auth.service';

/**
 * Restringe una ruta a un conjunto de roles, declarados en `data.roles`.
 *
 * Sin sesion va al login; con sesion y rol insuficiente va a `/sin-permiso`.
 * Son situaciones distintas y confundirlas desorienta al usuario.
 *
 * Al login se va con `returnUrl` (HU-06, v4): el visitante que pulsa «pedir
 * cita» en el catalogo publico esta pidiendo algo concreto, y aterrizar en la
 * pantalla inicial de su rol le obliga a rehacer el camino. Solo lo lleva la
 * rama sin sesion: a `/sin-permiso` se llega ya autenticado, y volver a una
 * ruta que el rol no alcanza no significa nada.
 */
export const rolGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaAutenticado()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const permitidos = (route.data['roles'] as Rol[] | undefined) ?? [];
  if (permitidos.length === 0) {
    return true;
  }

  const rol = auth.rol();
  return rol && permitidos.includes(rol) ? true : router.createUrlTree(['/sin-permiso']);
};
