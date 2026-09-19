import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Casa la ruta solo cuando no hay sesion abierta.
 *
 * Sirve para que una misma URL tenga dos versiones: la del visitante, dentro
 * del marco publico, y la de quien ha iniciado sesion, dentro del shell y con
 * sus guardas. Es `canMatch` y no `canActivate` a proposito: si no casa, el
 * enrutador sigue buscando y encuentra la otra declaracion de la ruta, en vez de
 * cortar la navegacion.
 */
export const sinSesionGuard: CanMatchFn = () => !inject(AuthService).estaAutenticado();
