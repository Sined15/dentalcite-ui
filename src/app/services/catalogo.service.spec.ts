import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { EspecialidadService } from './especialidad.service';
import { HorarioService } from './horario.service';
import { OdontologoService } from './odontologo.service';
import { TratamientoService } from './tratamiento.service';
import { UsuarioService } from './usuario.service';

/**
 * Fija la forma de las llamadas al backend.
 *
 * Lo que se comprueba aqui son las decisiones que un cambio distraido rompe sin
 * dar error de compilacion: que la baja del catalogo sea `PATCH` sin cuerpo y no
 * un `DELETE` —que no existe—, que los horarios cuelguen de su odontologo, y
 * que los parametros de paginacion viajen como el servidor los espera.
 */
const API = environment.apiUrl;

describe('servicios de la API', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('EspecialidadService', () => {
    let servicio: EspecialidadService;
    beforeEach(() => (servicio = TestBed.inject(EspecialidadService)));

    it('lista con page, size y sort', () => {
      servicio.listar({ page: 2, size: 50, sort: 'nombre,asc' }).subscribe();
      const req = httpMock.expectOne(
        (r) => r.url === `${API}/api/v1/especialidades` && r.method === 'GET',
      );
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('size')).toBe('50');
      expect(req.request.params.get('sort')).toBe('nombre,asc');
      req.flush({ content: [], totalElements: 0 });
    });

    it('omite sort cuando no se indica', () => {
      servicio.listar().subscribe();
      const req = httpMock.expectOne((r) => r.url === `${API}/api/v1/especialidades`);
      expect(req.request.params.has('sort')).toBe(false);
      // Valores por defecto del backend.
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      req.flush({ content: [], totalElements: 0 });
    });

    it('da de baja con PATCH y sin cuerpo, no con DELETE', () => {
      servicio.darDeBaja('esp-1').subscribe();
      const req = httpMock.expectOne(`${API}/api/v1/especialidades/esp-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toBeNull();
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });

  describe('TratamientoService', () => {
    it('envia especialidadId plano, no el objeto anidado', () => {
      const servicio = TestBed.inject(TratamientoService);
      servicio
        .crear({ codigo: 'T1', nombre: 'Limpieza', duracionMinutos: 30, especialidadId: 'esp-1' })
        .subscribe();
      const req = httpMock.expectOne(`${API}/api/v1/tratamientos`);
      expect(req.request.body).toEqual({
        codigo: 'T1',
        nombre: 'Limpieza',
        duracionMinutos: 30,
        especialidadId: 'esp-1',
      });
      expect(req.request.body).not.toHaveProperty('especialidad');
      req.flush({});
    });

    it('da de baja con PATCH sin cuerpo', () => {
      TestBed.inject(TratamientoService).darDeBaja('t-1').subscribe();
      const req = httpMock.expectOne(`${API}/api/v1/tratamientos/t-1`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });

  describe('OdontologoService', () => {
    it('envia especialidadesIds como lista de identificadores', () => {
      TestBed.inject(OdontologoService)
        .crear({
          cop: 'COP-1',
          nombres: 'Ana',
          apellidos: 'Ruiz',
          fichaId: 'f-1',
          especialidadesIds: ['e1', 'e2'],
        })
        .subscribe();
      const req = httpMock.expectOne(`${API}/api/v1/odontologos`);
      expect(req.request.body.especialidadesIds).toEqual(['e1', 'e2']);
      req.flush({});
    });
  });

  describe('HorarioService', () => {
    let servicio: HorarioService;
    beforeEach(() => (servicio = TestBed.inject(HorarioService)));

    it('cuelga la ruta del odontologo', () => {
      servicio.listar('odo-1').subscribe();
      httpMock.expectOne(`${API}/api/v1/odontologos/odo-1/horarios`).flush([]);
    });

    it('elimina de verdad: aqui si existe DELETE', () => {
      servicio.eliminar('odo-1', 'h-9').subscribe();
      const req = httpMock.expectOne(`${API}/api/v1/odontologos/odo-1/horarios/h-9`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('envia las horas como cadena, no como Date', () => {
      servicio.crear('odo-1', { diaSemana: 1, horaInicio: '09:00', horaFin: '13:00' }).subscribe();
      const req = httpMock.expectOne(`${API}/api/v1/odontologos/odo-1/horarios`);
      expect(typeof req.request.body.horaInicio).toBe('string');
      req.flush({});
    });
  });

  describe('UsuarioService', () => {
    let servicio: UsuarioService;
    beforeEach(() => (servicio = TestBed.inject(UsuarioService)));

    it('resuelve el perfil propio contra /me', () => {
      servicio.obtenerPerfilPropio().subscribe();
      httpMock.expectOne(`${API}/api/v1/usuarios/me`).flush({});
    });

    it('la baja es un PATCH con activo:false, no un DELETE', () => {
      servicio.darDeBaja('u-1').subscribe();
      const req = httpMock.expectOne(`${API}/api/v1/usuarios/u-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ activo: false });
      req.flush({});
    });

    it('el reemplazo total va por PUT', () => {
      servicio.reemplazar('u-1', { nombre: 'A', rol: 'PACIENTE', activo: true }).subscribe();
      const req = httpMock.expectOne(`${API}/api/v1/usuarios/u-1`);
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    it('el cambio de contraseña propia va a /me/password', () => {
      servicio.cambiarPasswordPropio({ passwordActual: 'a', nuevoPassword: 'b' }).subscribe();
      const req = httpMock.expectOne(`${API}/api/v1/usuarios/me/password`);
      expect(req.request.method).toBe('POST');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});
