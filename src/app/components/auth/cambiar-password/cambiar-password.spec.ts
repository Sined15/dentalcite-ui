import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { CambiarPassword } from './cambiar-password';

interface Interno {
  formulario: {
    valid: boolean;
    setValue: (v: { passwordActual: string; nuevoPassword: string; repetirPassword: string }) => void;
    controls: { repetirPassword: { hasError: (e: string) => boolean } };
  };
  enviar: () => void;
}

function montar() {
  TestBed.resetTestingModule();
  localStorage.clear();
  TestBed.configureTestingModule({
    imports: [CambiarPassword],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(CambiarPassword);
  fixture.detectChanges();
  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    c: fixture.componentInstance as unknown as Interno,
  };
}

describe('CambiarPassword', () => {
  it('no deja enviar si la repetición no coincide con la contraseña nueva', () => {
    const { c, http } = montar();
    c.formulario.setValue({
      passwordActual: 'Provisional1',
      nuevoPassword: 'Nueva.12345',
      repetirPassword: 'Nueva.12346',
    });
    expect(c.formulario.valid).toBe(false);
    expect(c.formulario.controls.repetirPassword.hasError('noCoinciden')).toBe(true);

    c.enviar();
    http.expectNone(() => true);
  });

  it('envía solo la actual y la nueva cuando la repetición coincide', () => {
    const { c, http } = montar();
    c.formulario.setValue({
      passwordActual: 'Provisional1',
      nuevoPassword: 'Nueva.12345',
      repetirPassword: 'Nueva.12345',
    });
    expect(c.formulario.valid).toBe(true);

    c.enviar();
    const peticion = http.expectOne((r) => r.url.includes('/password'));
    expect(peticion.request.body).toEqual({
      passwordActual: 'Provisional1',
      nuevoPassword: 'Nueva.12345',
    });
  });
});
