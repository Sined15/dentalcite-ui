import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/http/api.types';
import { Especialidad, Odontologo, Usuario } from '../../../models';
import { OdontologoEdit } from './odontologo-edit';

const USUARIOS = `${environment.apiUrl}/api/v1/usuarios`;
const ODONTOLOGOS = `${environment.apiUrl}/api/v1/odontologos`;
const ESPECIALIDADES = `${environment.apiUrl}/api/v1/especialidades`;

const ORTODONCIA: Especialidad = {
  id: 'esp-1',
  nombre: 'Ortodoncia',
  descripcion: null,
  activo: true,
  imagenUrl: null,
};

const YA_REGISTRADO: Odontologo = {
  id: 'odo-1',
  cop: 'COP-10001',
  nombres: 'Luis',
  apellidos: 'Perez',
  fichaId: 'fic-perez',
  activo: true,
  imagenUrl: null,
  especialidades: [ORTODONCIA],
};

const CUENTA_CREADA: Usuario = {
  id: 'usr-nueva',
  nombre: 'Ana Quispe',
  correo: 'ana.quispe@dentalcite.com',
  rol: 'ODONTOLOGO',
  activo: true,
  requiereCambioPassword: true,
  tokensValidosDesde: '2026-09-11T00:00:00Z',
  fichaId: 'fic-ana',
  passwordProvisional: 'abc12345',
};

function pagina<T>(content: T[]): PageResponse<T> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 100,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

interface Interno {
  formulario: {
    patchValue: (valores: Record<string, unknown>) => void;
    invalid: boolean;
  };
  enviar: () => void;
  error: () => string | null;
  modoCompletar: () => boolean;
}

/** El estado que el listado de cuentas manda al venir a terminar un registro. */
function montar(estado: Record<string, unknown> | null) {
  TestBed.configureTestingModule({
    imports: [OdontologoEdit],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      {
        provide: Router,
        useValue: {
          getCurrentNavigation: () => (estado ? { extras: { state: estado } } : null),
          navigate: () => Promise.resolve(true),
        },
      },
    ],
  });
  const httpMock = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(OdontologoEdit);
  const componente = fixture.componentInstance as unknown as Interno;

  httpMock.expectOne((r) => r.url === ESPECIALIDADES).flush(pagina([ORTODONCIA]));
  httpMock
    .expectOne((r) => r.url === ODONTOLOGOS && r.method === 'GET')
    .flush(pagina([YA_REGISTRADO]));

  return { httpMock, fixture, componente };
}

function rellenarProfesional(componente: Interno, cop: string): void {
  componente.formulario.patchValue({
    cop,
    nombres: 'Ana',
    apellidos: 'Quispe',
    especialidadesIds: ['esp-1'],
  });
}

function rellenarCuenta(componente: Interno): void {
  componente.formulario.patchValue({
    correo: 'ana.quispe@dentalcite.com',
    tipoDocumento: 'DNI',
    documento: '40555333',
  });
}

/**
 * El alta del odontólogo es de una sola pantalla. El profesional es el sujeto y
 * la cuenta lo que se le cuelga: antes había que crear la cuenta en otro menú y
 * volver aquí a elegir su ficha en un desplegable, de modo que nadie podía
 * existir como profesional hasta tener credenciales.
 *
 * Son dos llamadas y el orden es el que es —el registro exige que la ficha ya
 * tenga cuenta de rol odontólogo—, así que lo que se fija aquí es el encadenado y
 * lo que pasa cuando se rompe por la mitad.
 */
describe('OdontologoEdit', () => {
  it('elAlta_creaLaCuentaYLuegoElRegistro_conLaFichaDeLaPrimera', () => {
    const { httpMock, componente } = montar(null);
    rellenarProfesional(componente, 'COP-20002');
    rellenarCuenta(componente);

    componente.enviar();

    const alta = httpMock.expectOne((r) => r.url === USUARIOS && r.method === 'POST');
    expect(alta.request.body).toEqual({
      nombre: 'Ana Quispe',
      correo: 'ana.quispe@dentalcite.com',
      rol: 'ODONTOLOGO',
      tipoDocumento: 'DNI',
      documento: '40555333',
      passwordProvisional: undefined,
    });
    alta.flush(CUENTA_CREADA);

    const registro = httpMock.expectOne((r) => r.url === ODONTOLOGOS && r.method === 'POST');
    expect(registro.request.body).toEqual({
      cop: 'COP-20002',
      nombres: 'Ana',
      apellidos: 'Quispe',
      fichaId: 'fic-ana',
      especialidadesIds: ['esp-1'],
      imagenUrl: undefined,
    });
  });

  /**
   * La colegiatura repetida es la causa más probable de que falle el segundo paso,
   * y entonces la cuenta ya estaría creada. Comprobarla contra la lista que esta
   * pantalla ya carga evita dejar ese resto.
   */
  it('elAlta_conUnCopYaUsado_noLlegaACrearLaCuenta', () => {
    const { httpMock, componente } = montar(null);
    rellenarProfesional(componente, 'COP-10001');
    rellenarCuenta(componente);

    componente.enviar();

    httpMock.expectNone((r) => r.method === 'POST');
    expect(componente.error()).toContain('COP');
  });

  it('elAlta_siFallaElRegistro_elMensajeNombraLaCuentaQueSiQuedoCreada', () => {
    const { httpMock, componente } = montar(null);
    rellenarProfesional(componente, 'COP-20002');
    rellenarCuenta(componente);

    componente.enviar();
    httpMock.expectOne((r) => r.url === USUARIOS && r.method === 'POST').flush(CUENTA_CREADA);
    httpMock
      .expectOne((r) => r.url === ODONTOLOGOS && r.method === 'POST')
      .flush(
        { message: 'Ya existe un odontólogo con ese COP.' },
        { status: 409, statusText: 'Conflict' },
      );

    const mensaje = componente.error() ?? '';
    expect(mensaje).toContain('Ana Quispe');
    expect(mensaje).toContain('Completar registro profesional');
  });

  /**
   * Corregir y volver a guardar es lo que hace cualquiera tras el error, y la
   * cuenta ya existe: repetir el primer paso solo daría un conflicto por correo
   * repetido y dejaría el alta atascada.
   */
  it('elAlta_alReintentarTrasElFallo_noVuelveACrearLaCuenta', () => {
    const { httpMock, componente } = montar(null);
    rellenarProfesional(componente, 'COP-20002');
    rellenarCuenta(componente);

    componente.enviar();
    httpMock.expectOne((r) => r.url === USUARIOS && r.method === 'POST').flush(CUENTA_CREADA);
    httpMock
      .expectOne((r) => r.url === ODONTOLOGOS && r.method === 'POST')
      .flush(
        { message: 'Ya existe un odontólogo con ese COP.' },
        { status: 409, statusText: 'Conflict' },
      );

    rellenarProfesional(componente, 'COP-30003');
    componente.enviar();

    httpMock.expectNone((r) => r.url === USUARIOS);
    const reintento = httpMock.expectOne((r) => r.url === ODONTOLOGOS && r.method === 'POST');
    expect(reintento.request.body).toMatchObject({ cop: 'COP-30003', fichaId: 'fic-ana' });
  });

  /**
   * El modo con el que se termina una cuenta que quedó a medias: la ficha llega
   * dada y no hay credenciales que crear, porque la cuenta ya existe.
   */
  it('elModoCompletar_conLaFichaDada_noCreaNingunaCuenta', () => {
    const { httpMock, componente } = montar({ fichaId: 'fic-ana', nombre: 'Ana Quispe' });
    expect(componente.modoCompletar()).toBe(true);

    rellenarProfesional(componente, 'COP-20002');
    componente.enviar();

    httpMock.expectNone((r) => r.url === USUARIOS);
    const registro = httpMock.expectOne((r) => r.url === ODONTOLOGOS && r.method === 'POST');
    expect(registro.request.body).toMatchObject({ fichaId: 'fic-ana' });
  });

  /** Completar el registro de una ficha que ya lo tiene no es completar nada. */
  it('elModoCompletar_conUnaFichaQueYaTieneRegistro_avisaYNoLoIntenta', () => {
    const { componente } = montar({ fichaId: 'fic-perez', nombre: 'Luis Pérez' });

    expect(componente.error()).toContain('ya tiene su registro profesional');
  });
});
