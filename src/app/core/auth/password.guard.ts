import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Mientras el token lleve `requiere_cambio_password: true`, `PasswordFilter`
 * bloquea en el backend todas las rutas salvo `/api/v1/auth/**` y
 * `/api/v1/usuarios/me/password`. Este guard refleja esa realidad en el
 * cliente para que el usuario no choque contra una pantalla muerta.
 *
 * Se aplica en la ruta padre protegida, de modo que no hay URL que lo esquive.
 */
export const passwordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaAutenticado()) {
    return router.createUrlTree(['/login']);
  }

  return auth.requiereCambioPassword() ? router.createUrlTree(['/cambiar-password']) : true;
};
