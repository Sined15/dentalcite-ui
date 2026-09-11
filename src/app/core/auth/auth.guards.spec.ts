import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { passwordGuard } from './password.guard';
import { rolGuard } from './rol.guard';

/**
 * Los guards son la unica barrera de navegacion del cliente, y reflejan reglas
 * que el backend impone de verdad: `SecurityConfig` responde 403 a un rol
 * insuficiente, y `PasswordFilter` cierra la aplicacion entera mientras el
 * token exija cambiar la contraseña provisional. Si se rompen, el usuario
 * choca contra pantallas muertas en vez de ser redirigido.
 */

/** JWT sin firmar: solo interesa el payload, que es lo unico que se decodifica. */
function tokenCon(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

function sesion(rol: string, requiereCambio = false): string {
  return tokenCon({
    iss: 'dentalcite',
    sub: 'a13d43f3-8930-4f00-baf2-70d492be76b2',
    rol,
    requiere_cambio_password: requiereCambio,
    exp: Math.floor(Date.now() / 1000) + 8 * 3600,
  });
}

/**
 * `AuthService` lee el token al construirse, asi que hay que dejarlo en
 * `localStorage` antes de levantar el TestBed.
 */
function conSesion(token: string | null): void {
  TestBed.resetTestingModule();
  localStorage.clear();
  if (token) {
    localStorage.setItem('dentalcite.token', token);
  }
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
}

/** Devuelve el veredicto crudo del guard: `true` o el arbol de redireccion. */
function veredicto(
  guard: typeof rolGuard | typeof passwordGuard,
  roles?: string[],
  url = '/destino',
): boolean | UrlTree {
  const ruta = { data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot;
  const estado = { url } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => guard(ruta, estado)) as boolean | UrlTree;
}

/** Devuelve 'true' si el guard deja pasar, o la ruta de redireccion. */
function resultado(guard: typeof rolGuard | typeof passwordGuard, roles?: string[]): string {
  const r = veredicto(guard, roles);
  return r instanceof UrlTree ? r.toString() : String(r);
}

/**
 * El `returnUrl` tal como queda en el arbol, sin pasar por `toString()`: asi la
 * prueba dice que el destino se conserva, y no como Angular escapa las barras.
 */
function returnUrlDe(guard: typeof rolGuard | typeof passwordGuard, url: string): unknown {
  const r = veredicto(guard, ['ADMINISTRADOR'], url);
  return r instanceof UrlTree ? r.queryParams['returnUrl'] : null;
}

afterEach(() => localStorage.clear());

describe('rolGuard', () => {
  it('manda al login cuando no hay sesion', () => {
    conSesion(null);
    expect(resultado(rolGuard, ['ADMINISTRADOR'])).toBe('/login?returnUrl=%2Fdestino');
  });

  it('deja pasar cuando el rol esta entre los permitidos', () => {
    conSesion(sesion('ADMINISTRADOR'));
    expect(resultado(rolGuard, ['ADMINISTRADOR'])).toBe('true');
  });

  it('manda a /sin-permiso, no al login, cuando el rol no alcanza', () => {
    // Distinguirlo del login importa: la sesion es valida, lo que falta es permiso.
    conSesion(sesion('PACIENTE'));
    expect(resultado(rolGuard, ['ADMINISTRADOR'])).toBe('/sin-permiso');
  });

  it('deja pasar cuando la ruta no declara roles', () => {
    conSesion(sesion('PACIENTE'));
    expect(resultado(rolGuard)).toBe('true');
  });

  it('acepta cualquiera de los roles declarados', () => {
    conSesion(sesion('RECEPCIONISTA'));
    expect(resultado(rolGuard, ['ODONTOLOGO', 'RECEPCIONISTA', 'ADMINISTRADOR'])).toBe('true');
  });

  it('trata un token caducado como ausencia de sesion', () => {
    conSesion(tokenCon({ rol: 'ADMINISTRADOR', exp: Math.floor(Date.now() / 1000) - 60 }));
    expect(resultado(rolGuard, ['ADMINISTRADOR'])).toBe('/login?returnUrl=%2Fdestino');
  });

  it('trata un token ilegible como ausencia de sesion', () => {
    conSesion('esto-no-es-un-jwt');
    expect(resultado(rolGuard, ['ADMINISTRADOR'])).toBe('/login?returnUrl=%2Fdestino');
  });

  /**
   * HU-06 (v4): el visitante que pulsa «pedir cita» en el catalogo publico pedia
   * una franja concreta. Sin esto, el login lo dejaria en la portada de su rol y
   * tendria que rehacer el camino a mano.
   */
  it('conserva la query del destino dentro de returnUrl', () => {
    conSesion(null);
    expect(returnUrlDe(rolGuard, '/disponibilidad?tratamientoId=tra-1')).toBe(
      '/disponibilidad?tratamientoId=tra-1',
    );
  });

  it('no lleva returnUrl a /sin-permiso: ahi la sesion existe', () => {
    conSesion(sesion('PACIENTE'));
    expect(resultado(rolGuard, ['ADMINISTRADOR'])).toBe('/sin-permiso');
  });
});

describe('passwordGuard', () => {
  it('desvia a /cambiar-password cuando el token lo exige', () => {
    conSesion(sesion('ODONTOLOGO', true));
    expect(resultado(passwordGuard)).toBe('/cambiar-password');
  });

  it('deja pasar cuando el token no lo exige', () => {
    conSesion(sesion('ODONTOLOGO', false));
    expect(resultado(passwordGuard)).toBe('true');
  });

  it('manda al login cuando no hay sesion', () => {
    conSesion(null);
    expect(resultado(passwordGuard)).toBe('/login?returnUrl=%2Fdestino');
  });

  it('conserva la query del destino dentro de returnUrl', () => {
    conSesion(null);
    expect(returnUrlDe(passwordGuard, '/disponibilidad?tratamientoId=tra-1')).toBe(
      '/disponibilidad?tratamientoId=tra-1',
    );
  });

  it('no lleva returnUrl al cambio de contraseña: ahi la sesion existe', () => {
    conSesion(sesion('ODONTOLOGO', true));
    expect(resultado(passwordGuard)).toBe('/cambiar-password');
  });
});

describe('AuthService', () => {
  it('redirige a su perfil cuando el rol es PACIENTE', () => {
    conSesion(sesion('PACIENTE'));
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    const ruta = TestBed.runInInjectionContext(() => inject(AuthService).rutaInicial());

    expect(ruta).toBe('/perfil');
  });
});
