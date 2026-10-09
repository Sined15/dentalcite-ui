import { provideZonelessChangeDetection, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthApi } from '../../services/auth.api';
import { AuthService } from './auth.service';


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
    const auth = levantar('falla');
    auth.logout();
    await asentar();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(auth.token()).toBeNull();
  });

  it('limpiarSesion no navega por si sola', async () => {
    const auth = levantar('ok');
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login');

    auth.limpiarSesion();
    await asentar();

    expect(router.url).toBe('/login');
  });
});
