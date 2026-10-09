import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { PacienteService } from './paciente.service';

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
    expect(cuerpo['correo']).toBeUndefined();
    expect(cuerpo['password']).toBeUndefined();
  });

  it('HU-13: la busqueda manda el termino y la pagina del servidor', () => {
    servicio.buscar('  Huaman  ', { page: 2, size: 50 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === PACIENTES && r.method === 'GET');
    expect(req.request.params.get('q')).toBe('Huaman');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('50');
  });

  it('HU-13: el termino en blanco viaja ausente, no vacio', () => {
    servicio.buscar('   ').subscribe();

    const req = httpMock.expectOne((r) => r.url === PACIENTES && r.method === 'GET');
    expect(req.request.params.has('q')).toBe(false);
  });

  it('HU-13: la correccion de la ficha es un PUT sin documento', () => {
    servicio
      .actualizar('fic-1', { nombres: 'Rosa', apellidos: 'Huaman', alergias: 'Penicilina' })
      .subscribe();

    const req = httpMock.expectOne(`${PACIENTES}/fic-1`);
    expect(req.request.method).toBe('PUT');

    const cuerpo = req.request.body as Record<string, unknown>;
    expect(cuerpo['alergias']).toBe('Penicilina');
    expect(cuerpo['documento']).toBeUndefined();
    expect(cuerpo['tipoDocumento']).toBeUndefined();
  });
});
