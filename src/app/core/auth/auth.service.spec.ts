import { provideZonelessChangeDetection, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthApi } from '../../services/auth.api';
import { AuthService } from './auth.service';

/**
 * A donde va el usuario cuando se cierra su sesion, que no es la misma respuesta
 * para los tres cierres que tiene la aplicacion.
 *
 * El voluntario —este— deja al usuario en la portada publica: se esta yendo. Los
 * otros dos siguen llevando a `/login` y viven en otro sitio: el interceptor
 * cuando el backend revoca el token (`auth.interceptor.spec.ts`) y el cambio de
 * la contraseña provisional. Ahi el usuario estaba a mitad de algo.
 */

/** Destinos minimos, para que la navegacion tenga a donde llegar. */
@Component({ selector: 'app-destino-stub', template: '' })
class DestinoStub {}

const RUTAS = [
  { path: '', component: DestinoStub },
  { path: 'login', component: DestinoStub },
];

function levantar(respuesta: 'ok' | 'falla'): AuthService {
  TestBed.resetTestingModule();
  localStorage.clear();
  const apiDoble = {
    logout: () =>
      respuesta === 'ok' ? of({ message: 'ok' }) : throwError(() => new Error('sin red')),
  };
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(RUTAS),
      { provide: AuthApi, useValue: apiDoble },
    ],
  });
  return TestBed.inject(AuthService);
}

/** La navegacion no se resuelve en el mismo tick que la respuesta. */
async function asentar(): Promise<void> {
  await new Promise((listo) => setTimeout(listo, 0));
}

describe('AuthService', () => {
  afterEach(() => localStorage.clear());

  it('al cerrar sesion voluntariamente va a la portada, no al login', async () => {
    const auth = levantar('ok');
    auth.logout();
    await asentar();

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('si el backend falla al cerrar sesion, igual va a la portada', async () => {
    // La sesion local muere pase lo que pase: dejarla viva con un token que el
    // backend pudo revocar solo daria un 401 en la pantalla siguiente.
    const auth = levantar('falla');
    auth.logout();
    await asentar();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(auth.token()).toBeNull();
  });

  it('limpiarSesion no navega por si sola', async () => {
    // Es la pieza que usan el interceptor y el cambio de contraseña, que eligen
    // su propio destino. Si navegara, les impondria este.
    const auth = levantar('ok');
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login');

    auth.limpiarSesion();
    await asentar();

    expect(router.url).toBe('/login');
  });
});
