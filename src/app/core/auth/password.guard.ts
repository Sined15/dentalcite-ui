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
export const passwordGuard: CanActivateFn = (_ruta, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaAutenticado()) {
    // Mismo `returnUrl` que `rolGuard`, y por lo mismo: sin sesion el usuario
    // pedia una pantalla concreta y hay que devolverselo tras el login. La rama
    // de abajo no lo lleva: ahi la sesion existe y el cambio de contraseña es
    // obligatorio, asi que no hay destino que conservar.
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  return auth.requiereCambioPassword() ? router.createUrlTree(['/cambiar-password']) : true;
};
