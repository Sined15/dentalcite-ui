import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/http/api.types';
import { Paciente, Rol } from '../../../models';
import { UsuarioEdit } from './usuario-edit';

const USUARIOS = `${environment.apiUrl}/api/v1/usuarios`;
const PACIENTES = `${environment.apiUrl}/api/v1/pacientes`;

const ROSA: Paciente = {
  id: 'fic-rosa',
  numeroHistoria: 'HC-00003',
  tipoDocumento: 'DNI',
  documento: '71234567',
  nombres: 'Rosa',
  apellidos: 'Delgado',
  telefono: '987654321',
  tieneCuenta: false,
};

function pagina(content: Paciente[]): PageResponse<Paciente> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 5,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

interface Interno {
  rolesOfrecidos: readonly Rol[];
  formulario: {
    patchValue: (valores: Record<string, unknown>) => void;
    controls: { rol: { value: Rol } };
  };
  enviar: () => void;
  error: () => string | null;
}

function montar(id: string | null) {
  TestBed.configureTestingModule({
    imports: [UsuarioEdit],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
      },
    ],
  });
  const httpMock = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(UsuarioEdit);
  return { httpMock, fixture, componente: fixture.componentInstance as unknown as Interno };
}

describe('UsuarioEdit', () => {
  it('elAlta_noOfreceElRolDeOdontologo', () => {
    const { componente } = montar(null);

    expect(componente.rolesOfrecidos).toEqual(['PACIENTE', 'RECEPCIONISTA', 'ADMINISTRADOR']);
    expect(componente.formulario.controls.rol.value).toBe('RECEPCIONISTA');
  });

  it('elAltaDePersonal_noPideDocumento', async () => {
    const { fixture } = montar(null);
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('[formcontrolname="documento"]')).toBeNull();
  });

  it('elAltaDePersonal_noEnviaDocumentoNiTipoDeDocumento', () => {
    const { httpMock, componente } = montar(null);

    componente.formulario.patchValue({
      nombre: 'Carmen Aguilar',
      correo: 'recepcion2@dentalcite.com',
      rol: 'RECEPCIONISTA',
    });
    componente.enviar();

    const peticion = httpMock.expectOne((r) => r.url === USUARIOS && r.method === 'POST');
    expect(peticion.request.body).toEqual({
      nombre: 'Carmen Aguilar',
      correo: 'recepcion2@dentalcite.com',
      rol: 'RECEPCIONISTA',
      tipoDocumento: undefined,
      documento: undefined,
      passwordProvisional: undefined,
    });
  });

  it('elAltaDePaciente_conSuFichaEnElPadron_mandaSuDocumentoParaVincularla', () => {
    const { httpMock, componente } = montar(null);

    componente.formulario.patchValue({
      nombre: 'Rosa Delgado',
      correo: 'rosa@demo.com',
      rol: 'PACIENTE',
      tipoDocumento: 'DNI',
      documento: '71234567',
    });
    componente.enviar();

    httpMock
      .expectOne((r) => r.url === PACIENTES && r.method === 'GET')
      .flush(pagina([ROSA]));

    const alta = httpMock.expectOne((r) => r.url === USUARIOS && r.method === 'POST');
    expect(alta.request.body).toMatchObject({
      rol: 'PACIENTE',
      tipoDocumento: 'DNI',
      documento: '71234567',
    });
  });

  it('elAltaDePaciente_conUnDocumentoQueNoEstaEnElPadron_noCreaLaCuenta', () => {
    const { httpMock, componente } = montar(null);

    componente.formulario.patchValue({
      nombre: 'Nadie',
      correo: 'nadie@demo.com',
      rol: 'PACIENTE',
      tipoDocumento: 'DNI',
      documento: '00000000',
    });
    componente.enviar();

    httpMock.expectOne((r) => r.url === PACIENTES && r.method === 'GET').flush(pagina([]));

    httpMock.expectNone((r) => r.url === USUARIOS && r.method === 'POST');
    expect(componente.error()).toContain('Regístralo primero en Pacientes');
  });

  it('elAltaDePaciente_siEsaFichaYaTieneCuenta_avisaYNoLoIntenta', () => {
    const { httpMock, componente } = montar(null);

    componente.formulario.patchValue({
      nombre: 'Rosa Delgado',
      correo: 'otra@demo.com',
      rol: 'PACIENTE',
      tipoDocumento: 'DNI',
      documento: '71234567',
    });
    componente.enviar();

    httpMock
      .expectOne((r) => r.url === PACIENTES && r.method === 'GET')
      .flush(pagina([{ ...ROSA, tieneCuenta: true }]));

    httpMock.expectNone((r) => r.url === USUARIOS && r.method === 'POST');
    expect(componente.error()).toContain('ya tiene cuenta');
  });

  it('laEdicion_ofreceLosCuatroRoles', () => {
    const { componente } = montar('usr-1');

    expect(componente.rolesOfrecidos).toEqual([
      'PACIENTE',
      'RECEPCIONISTA',
      'ODONTOLOGO',
      'ADMINISTRADOR',
    ]);
  });
});
