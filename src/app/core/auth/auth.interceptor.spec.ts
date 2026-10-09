import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';


function tokenCon(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

const TOKEN = tokenCon({ sub: 'a13d43f3', rol: 'ADMINISTRADOR', exp: Math.floor(Date.now() / 1000) + 3600 });
const CADUCADO = tokenCon({ sub: 'a13d43f3', rol: 'PACIENTE', exp: Math.floor(Date.now() / 1000) - 60 });
const API = environment.apiUrl;

@Component({ selector: 'app-login-stub', template: '' })
class LoginStub {}

function levantar(token: string | null): void {
  TestBed.resetTestingModule();
  localStorage.clear();
  if (token) {
    localStorage.setItem('dentalcite.token', token);
  }
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', component: LoginStub }]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    levantar(TOKEN);
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('anade el token a las peticiones dirigidas a la API', () => {
    http.get(`${API}/api/v1/especialidades`).subscribe();
    const req = httpMock.expectOne(`${API}/api/v1/especialidades`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    req.flush({});
  });

  it('no anade el token al login', () => {
    http.post(`${API}/api/v1/auth/login`, {}).subscribe();
    const req = httpMock.expectOne(`${API}/api/v1/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ token: 'x' });
  });

  it('no anade el token al registro', () => {
    http.post(`${API}/api/v1/auth/registro`, {}).subscribe();
    const req = httpMock.expectOne(`${API}/api/v1/auth/registro`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ message: 'ok' });
  });

  it('no toca peticiones a otros origenes', () => {
    http.get('https://ejemplo.invalido/datos').subscribe();
    const req = httpMock.expectOne('https://ejemplo.invalido/datos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('no anade ninguna cabecera fuera de Authorization', () => {
    http.get(`${API}/api/v1/consultorios`).subscribe();
    const req = httpMock.expectOne(`${API}/api/v1/consultorios`);
    const propias = req.request.headers.keys().map((k) => k.toLowerCase());
    expect(propias.filter((k) => k !== 'authorization' && k !== 'content-type')).toEqual([]);
    req.flush([]);
  });

  it('cierra la sesion y va al login ante un 401', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    expect(auth.token()).toBe(TOKEN);

    http.get(`${API}/api/v1/usuarios`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${API}/api/v1/usuarios`)
      .flush({ message: 'no autorizado' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('dentalcite.token')).toBeNull();
    await new Promise((listo) => setTimeout(listo, 0));
    expect(router.url).toBe('/login');
  });

  it('deja pasar un 403 sin cerrar la sesion', () => {
    const auth = TestBed.inject(AuthService);
    http.get(`${API}/api/v1/usuarios`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${API}/api/v1/usuarios`)
      .flush({ message: 'sin permiso' }, { status: 403, statusText: 'Forbidden' });

    expect(auth.token()).toBe(TOKEN);
  });

  it('deja pasar un 409 sin cerrar la sesion', () => {
    const auth = TestBed.inject(AuthService);
    http.post(`${API}/api/v1/bloqueos`, {}).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${API}/api/v1/bloqueos`)
      .flush({ message: 'conflicto', citasActivas: [] }, { status: 409, statusText: 'Conflict' });

    expect(auth.token()).toBe(TOKEN);
  });

  it('no envia un token caducado: la portada sale anonima en vez de rebotar al login', async () => {
    levantar(CADUCADO);
    const http2 = TestBed.inject(HttpClient);
    const mock2 = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);

    http2.get(`${API}/api/v1/publico/tratamientos`).subscribe();
    const req = mock2.expectOne(`${API}/api/v1/publico/tratamientos`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);

    await new Promise((listo) => setTimeout(listo, 0));
    expect(router.url).not.toBe('/login');
    mock2.verify();
  });

  it('no rompe cuando no hay token', () => {
    levantar(null);
    const http2 = TestBed.inject(HttpClient);
    const mock2 = TestBed.inject(HttpTestingController);
    http2.get(`${API}/api/v1/consultorios`).subscribe();
    const req = mock2.expectOne(`${API}/api/v1/consultorios`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
    mock2.verify();
  });
});
