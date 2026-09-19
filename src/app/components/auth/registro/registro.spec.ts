import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { Registro } from './registro';

/**
 * El registro no abre sesion, asi que lo unico que tiene que hacer con el
 * destino pedido es no perderlo: pasarlo al login, que es quien vuelve a el.
 */

const API_REGISTRO = `${environment.apiUrl}/api/v1/auth/registro`;

@Component({ selector: 'app-destino-stub', template: '' })
class DestinoStub {}

interface Interno {
  formulario: { patchValue: (v: Record<string, unknown>) => void };
  enviar: () => void;
}

async function registrarCon(returnUrl: string | null): Promise<Router> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [Registro],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: 'login', component: DestinoStub }]),
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
  const fixture = TestBed.createComponent(Registro);
  const componente = fixture.componentInstance as unknown as Interno;
  fixture.detectChanges();

  componente.formulario.patchValue({
    nombres: 'Ana',
    apellidos: 'Torres',
    tipoDocumento: 'DNI',
    documento: '12345678',
    correo: 'ana@dentalcite.pe',
    password: 'Secreta.123',
    consentimientoAceptado: true,
  });
  componente.enviar();
  http.expectOne(API_REGISTRO).flush({ message: 'ok' });
  await fixture.whenStable();
  await new Promise((listo) => setTimeout(listo, 0));
  http.verify();

  return TestBed.inject(Router);
}

describe('Registro', () => {
  afterEach(() => localStorage.clear());

  it('tras crear la cuenta lleva al login con el destino pedido', async () => {
    const router = await registrarCon('/disponibilidad?tratamientoId=tra-1&inicio=09:30');
    const arbol = router.parseUrl(router.url);
    expect(router.url.startsWith('/login')).toBe(true);
    expect(arbol.queryParams['returnUrl']).toBe('/disponibilidad?tratamientoId=tra-1&inicio=09:30');
  });

  it('sin destino pedido lleva al login a secas', async () => {
    const router = await registrarCon(null);
    expect(router.url).toBe('/login');
  });
});
