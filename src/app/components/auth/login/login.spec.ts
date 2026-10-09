import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { Login } from './login';


const API_LOGIN = `${environment.apiUrl}/api/v1/auth/login`;

function sesion(rol: string, requiereCambio = false): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = {
    iss: 'dentalcite',
    sub: 'a13d43f3-8930-4f00-baf2-70d492be76b2',
    rol,
    requiere_cambio_password: requiereCambio,
    exp: Math.floor(Date.now() / 1000) + 8 * 3600,
  };
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

@Component({ selector: 'app-destino-stub', template: '' })
class DestinoStub {}

const RUTAS = [
  { path: 'perfil', component: DestinoStub },
  { path: 'usuarios', component: DestinoStub },
  { path: 'cambiar-password', component: DestinoStub },
  { path: 'disponibilidad', component: DestinoStub },
];

interface Interno {
  formulario: { setValue: (v: { correo: string; password: string }) => void };
  enviar: () => void;
}

async function entrarCon(returnUrl: string | null, token: string): Promise<Router> {
  TestBed.resetTestingModule();
  localStorage.clear();
  TestBed.configureTestingModule({
    imports: [Login],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(RUTAS),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
        },
      },
    ],
  });

  const http = TestBed.inject(HttpTestingController);
  const fixture: ComponentFixture<Login> = TestBed.createComponent(Login);
  const componente = fixture.componentInstance as unknown as Interno;
  fixture.detectChanges();

  componente.formulario.setValue({ correo: 'ana@dentalcite.pe', password: 'Secreta.123' });
  componente.enviar();
  http.expectOne(API_LOGIN).flush({ token });
  await fixture.whenStable();
  await new Promise((listo) => setTimeout(listo, 0));
  http.verify();

  return TestBed.inject(Router);
}

describe('Login', () => {
  afterEach(() => localStorage.clear());

  it('sin returnUrl aterriza en la pantalla inicial de su rol', async () => {
    const router = await entrarCon(null, sesion('PACIENTE'));
    expect(router.url).toBe('/perfil');
  });

  it('con un returnUrl interno vuelve a lo que el usuario pidio', async () => {
    const router = await entrarCon('/disponibilidad?tratamientoId=tra-1', sesion('PACIENTE'));
    expect(router.url).toBe('/disponibilidad?tratamientoId=tra-1');
  });

  it('el cambio de contraseña obligatorio manda aunque haya returnUrl', async () => {
    const router = await entrarCon('/disponibilidad', sesion('ODONTOLOGO', true));
    expect(router.url).toBe('/cambiar-password');
  });

  it('ignora un returnUrl que apunta a otro sitio', async () => {
    const router = await entrarCon('https://ejemplo.invalido/robar', sesion('ADMINISTRADOR'));
    expect(router.url).toBe('/usuarios');
  });

  it('ignora un returnUrl que empieza por doble barra', async () => {
    const router = await entrarCon('//ejemplo.invalido', sesion('ADMINISTRADOR'));
    expect(router.url).toBe('/usuarios');
  });
});

describe('Login · fallos', () => {
  afterEach(() => localStorage.clear());

  function intentarYFallar(estado: number, cuerpo: object): HTMLElement {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(RUTAS),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<Login> = TestBed.createComponent(Login);
    const componente = fixture.componentInstance as unknown as Interno;
    fixture.detectChanges();
    componente.formulario.setValue({ correo: 'ana@dentalcite.pe', password: 'Secreta.123' });
    componente.enviar();
    http.expectOne(API_LOGIN).flush(cuerpo, { status: estado, statusText: 'Error' });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('unas credenciales erróneas se explican sin bloquear el botón', () => {
    const raiz = intentarYFallar(401, { message: 'Bad credentials' });
    expect(raiz.querySelector('[role="alert"]')?.textContent).toContain(
      'El correo o la contraseña no coinciden',
    );
    expect(raiz.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it('la cuenta bloqueada apaga el botón y dice por qué', () => {
    const raiz = intentarYFallar(423, { message: 'Cuenta bloqueada' });
    expect(raiz.querySelector('[role="alert"]')?.textContent).toContain(
      'Cuenta bloqueada por cinco minutos',
    );
    expect(raiz.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(raiz.querySelector('#por-que-bloqueada')).not.toBeNull();
  });
});

describe('Login · camino al registro', () => {
  afterEach(() => localStorage.clear());

  function enlaceAlRegistro(returnUrl: string | null): string | null {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(RUTAS),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return raiz.querySelector('a[href^="/registro"]')?.getAttribute('href') ?? null;
  }

  it('el enlace al registro conserva el destino pedido', () => {
    const href = enlaceAlRegistro('/disponibilidad?tratamientoId=tra-1&inicio=09:30');
    const destino = new URL(href ?? '', 'http://x').searchParams.get('returnUrl');
    expect(destino).toBe('/disponibilidad?tratamientoId=tra-1&inicio=09:30');
  });

  it('no inventa un destino si no se pidio ninguno', () => {
    expect(enlaceAlRegistro(null)).toBe('/registro');
  });

  it('tampoco propaga un destino ajeno a la aplicacion', () => {
    expect(enlaceAlRegistro('https://ejemplo.invalido/robar')).toBe('/registro');
  });
});
