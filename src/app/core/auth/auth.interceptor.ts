import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** El login y el registro son publicos: enviarles el token sobra. */
const RUTAS_PUBLICAS = ['/api/v1/auth/login', '/api/v1/auth/registro'];

/**
 * Anade `Authorization: Bearer <token>` a las peticiones hacia la API.
 *
 * No se anade ninguna otra cabecera: el CORS del backend solo admite
 * `Authorization` y `Content-Type`, y cualquier extra rompe el preflight.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const esApi = req.url.startsWith(environment.apiUrl);
  const esPublica = RUTAS_PUBLICAS.some((ruta) => req.url.includes(ruta));
  const token = auth.token();

  const peticion =
    esApi && !esPublica && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 sobrevenido: el token caduco o el backend lo revoco (logout, cambio
      // de rol, desactivacion o cambio de contraseña). No hay refresco en esta
      // API, asi que no se reintenta: se cierra sesion.
      if (error.status === 401 && !esPublica) {
        auth.limpiarSesion();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
