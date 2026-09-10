import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { PacienteService } from './paciente.service';

/**
 * HU-12. Fija lo que un cambio distraido rompe sin que el compilador proteste:
 * que el alta presencial no mande credenciales —el criterio dice «sin
 * credenciales de acceso»— y que el consentimiento viaje con su version, que es
 * lo que RNF-06 obliga a registrar.
 */
const PACIENTES = `${environment.apiUrl}/api/v1/pacientes`;

describe('PacienteService', () => {
  let servicio: PacienteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    servicio = TestBed.inject(PacienteService);
  });

  afterEach(() => httpMock.verify());

  it('registra al paciente con su consentimiento y sin credenciales', () => {
    servicio
      .crear({
        nombres: 'Rosa',
        apellidos: 'Huaman',
        tipoDocumento: 'DNI',
        documento: '71234567',
        telefono: '987654321',
        consentimientoAceptado: true,
        versionConsentimiento: '1.0',
      })
      .subscribe();

    const req = httpMock.expectOne(PACIENTES);
    expect(req.request.method).toBe('POST');

    const cuerpo = req.request.body as Record<string, unknown>;
    expect(cuerpo['documento']).toBe('71234567');
    expect(cuerpo['consentimientoAceptado']).toBe(true);
    expect(cuerpo['versionConsentimiento']).toBe('1.0');
    // Ni correo ni contraseña: este paciente no tiene cuenta.
    expect(cuerpo['correo']).toBeUndefined();
    expect(cuerpo['password']).toBeUndefined();
  });
});
