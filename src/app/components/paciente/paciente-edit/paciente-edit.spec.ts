import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { Paciente } from '../../../models';
import { PacienteEdit } from './paciente-edit';

const PACIENTES = `${environment.apiUrl}/api/v1/pacientes`;

const REGISTRADO: Paciente = {
  id: 'fic-1',
  numeroHistoria: 'HC-00042',
  tipoDocumento: 'DNI',
  documento: '71234567',
  nombres: 'Rosa',
  apellidos: 'Huaman',
  telefono: '987654321',
  tieneCuenta: false,
};

interface Interno {
  formulario: {
    patchValue: (valores: Record<string, unknown>) => void;
    invalid: boolean;
    controls: { consentimientoAceptado: { value: boolean } };
  };
  enviar: () => void;
  error: () => string | null;
}

describe('PacienteEdit', () => {
  let fixture: ComponentFixture<PacienteEdit>;
  let httpMock: HttpTestingController;
  let componente: Interno;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PacienteEdit],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PacienteEdit);
    componente = fixture.componentInstance as unknown as Interno;
  });

  function rellenar(consentimiento: boolean): void {
    componente.formulario.patchValue({
      nombres: 'Rosa',
      apellidos: 'Huaman',
      tipoDocumento: 'DNI',
      documento: '71234567',
      telefono: '987654321',
      consentimientoAceptado: consentimiento,
    });
  }

  it('sin el consentimiento del titular no llega a enviar nada', () => {
    rellenar(false);
    expect(componente.formulario.invalid).toBe(true);

    componente.enviar();
    httpMock.expectNone(PACIENTES);
  });

  it('con el consentimiento marcado registra al paciente y limpia el formulario', () => {
    rellenar(true);
    componente.enviar();

    const req = httpMock.expectOne(PACIENTES);
    expect(req.request.method).toBe('POST');
    req.flush(REGISTRADO);

    expect(componente.formulario.controls.consentimientoAceptado.value).toBe(false);
  });

  it('muestra el mensaje del 409 cuando el documento ya esta registrado', () => {
    rellenar(true);
    componente.enviar();

    httpMock.expectOne(PACIENTES).flush(
      { message: 'Ya existe un paciente registrado con ese tipo y número de documento (RN-10).' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(componente.error()).toContain('Ya existe un paciente registrado');
  });
});
