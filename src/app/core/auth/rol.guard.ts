import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../../models';
import { AuthService } from './auth.service';

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
