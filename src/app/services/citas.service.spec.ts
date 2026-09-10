import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { CitaService } from './cita.service';
import { DisponibilidadService } from './disponibilidad.service';

/**
 * Fija la forma de las llamadas del Sprint 2, como `catalogo.service.spec.ts`
 * hace con las del catalogo.
 *
 * Lo que se comprueba es lo que un cambio distraido rompe sin que el compilador
 * proteste: que un filtro sin elegir viaje **ausente** y no en blanco —para el
 * servidor un parametro vacio no significa «todos»—, que la cancelacion sea un
 * `PATCH` con motivo en el cuerpo, y que la reserva no mande paciente alguno,
 * porque el servidor lo saca del token (HU-14 es la que anadira ese campo).
 */
const API = environment.apiUrl;
const CITAS = `${API}/api/v1/citas`;
const DISPONIBILIDAD = `${API}/api/v1/disponibilidad`;

describe('servicios de citas y disponibilidad', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('DisponibilidadService', () => {
    let servicio: DisponibilidadService;
    beforeEach(() => (servicio = TestBed.inject(DisponibilidadService)));

    it('HU-08: consulta el rango de un tratamiento', () => {
      servicio
        .consultar({ tratamientoId: 'tra-1', desde: '2026-10-12', hasta: '2026-10-18' })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === DISPONIBILIDAD && r.method === 'GET');
      expect(req.request.params.get('tratamientoId')).toBe('tra-1');
      expect(req.request.params.get('desde')).toBe('2026-10-12');
      expect(req.request.params.get('hasta')).toBe('2026-10-18');
    });

    it('RN-08: «cualquier odontologo» es la ausencia del parametro, no un valor vacio', () => {
      servicio
        .consultar({
          tratamientoId: 'tra-1',
          odontologoId: '',
          desde: '2026-10-12',
          hasta: '2026-10-18',
        })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === DISPONIBILIDAD);
      expect(req.request.params.has('odontologoId')).toBe(false);
    });

    it('con odontologo elegido, lo manda', () => {
      servicio
        .consultar({
          tratamientoId: 'tra-1',
          odontologoId: 'odo-9',
          desde: '2026-10-12',
          hasta: '2026-10-18',
        })
        .subscribe();

      expect(httpMock.expectOne((r) => r.url === DISPONIBILIDAD).request.params.get('odontologoId'))
        .toBe('odo-9');
    });
  });

  describe('CitaService', () => {
    let servicio: CitaService;
    beforeEach(() => (servicio = TestBed.inject(CitaService)));

    it('HU-09: reserva sin mandar paciente', () => {
      servicio
        .reservar({
          tratamientoId: 'tra-1',
          odontologoId: 'odo-1',
          fecha: '2026-10-12',
          hora: '09:30',
        })
        .subscribe();

      const req = httpMock.expectOne(CITAS);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        tratamientoId: 'tra-1',
        odontologoId: 'odo-1',
        fecha: '2026-10-12',
        hora: '09:30',
      });
      expect(req.request.body).not.toHaveProperty('pacienteId');
    });

    it('HU-11: la agenda manda el rango y la paginacion', () => {
      servicio
        .listar({ desde: '2026-10-12', hasta: '2026-10-12' }, { page: 1, size: 20 })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === CITAS && r.method === 'GET');
      expect(req.request.params.get('desde')).toBe('2026-10-12');
      expect(req.request.params.get('hasta')).toBe('2026-10-12');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('size')).toBe('20');
    });

    it('los filtros sin elegir no viajan', () => {
      servicio
        .listar({ desde: '2026-10-12', hasta: '2026-10-12', odontologoId: '', estado: '' })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === CITAS && r.method === 'GET');
      expect(req.request.params.has('odontologoId')).toBe(false);
      expect(req.request.params.has('estado')).toBe(false);
    });

    it('los filtros elegidos si viajan', () => {
      servicio
        .listar({
          desde: '2026-10-12',
          hasta: '2026-10-12',
          odontologoId: 'odo-1',
          estado: 'CANCELADA',
        })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === CITAS && r.method === 'GET');
      expect(req.request.params.get('odontologoId')).toBe('odo-1');
      expect(req.request.params.get('estado')).toBe('CANCELADA');
    });

    it('no manda el orden: lo pone el servidor', () => {
      // Duplicarlo aqui obligaria a mantener las dos copias de acuerdo.
      servicio.listar({ desde: '2026-10-12', hasta: '2026-10-12' }).subscribe();

      expect(httpMock.expectOne((r) => r.url === CITAS).request.params.has('sort')).toBe(false);
    });

    it('RF-20: cancelar es un PATCH con el motivo en el cuerpo', () => {
      servicio.cancelar('cita-1', 'El paciente reprograma').subscribe();

      const req = httpMock.expectOne(`${CITAS}/cita-1/cancelar`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ motivo: 'El paciente reprograma' });
    });

    it('RF-21: el historial cuelga de la cita', () => {
      servicio.historial('cita-1').subscribe();

      const req = httpMock.expectOne(`${CITAS}/cita-1/historial`);
      expect(req.request.method).toBe('GET');
    });
  });
});
