import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/api.types';
import { Especialidad, Odontologo, Plan, Tratamiento } from '../../models';
import { PlanEdit, PlanEditDatos } from './plan-edit';

const API = `${environment.apiUrl}/api/v1/planes`;
const API_TRATAMIENTOS = `${environment.apiUrl}/api/v1/tratamientos`;
const API_ODONTOLOGOS = `${environment.apiUrl}/api/v1/odontologos`;

const ENDODONCIA: Especialidad = {
  id: 'esp-1',
  nombre: 'ENDODONCIA',
  descripcion: null,
  activo: true,
  imagenUrl: null,
};

const TRATAMIENTOS: Tratamiento[] = [
  {
    id: 'tra-1',
    codigo: 'T-001',
    nombre: 'Ortodoncia',
    descripcion: null,
    duracionMinutos: 30,
    especialidad: ENDODONCIA,
    activo: true,
    imagenUrl: null,
  },
  {
    id: 'tra-2',
    codigo: 'T-002',
    nombre: 'Retirado',
    descripcion: null,
    duracionMinutos: 30,
    especialidad: ENDODONCIA,
    activo: false,
    imagenUrl: null,
  },
];

const ODONTOLOGOS: Odontologo[] = [
  {
    id: 'odo-1',
    cop: 'COP-1',
    nombres: 'Luis',
    apellidos: 'Pérez',
    fichaId: 'fic-odo-1',
    activo: true,
    imagenUrl: null,
    especialidades: [ENDODONCIA],
  },
];

const PLAN: Plan = {
  id: 'plan-1',
  paciente: { id: 'fic-1', nombre: 'Ramos, Julio' },
  tratamiento: { id: 'tra-1', nombre: 'Ortodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  sesionesPrevistas: 6,
  activo: true,
  motivoSuspension: null,
  creadoEn: '2026-09-01T09:00:00Z',
  avance: { completadas: 0, pendientes: 6 },
  sesiones: [],
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

/** JWT sin firmar: solo se decodifica el payload, como en auth.guards.spec.ts. */
function sesionCon(rol: string): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64({
    iss: 'dentalcite',
    sub: 'a13d43f3-8930-4f00-baf2-70d492be76b2',
    rol,
    requiere_cambio_password: false,
    exp: Math.floor(Date.now() / 1000) + 8 * 3600,
  })}.firma`;
}

interface Interno {
  formulario: {
    patchValue: (v: Record<string, unknown>) => void;
    invalid: boolean;
  };
  planificaParaOtro: () => boolean;
  tratamientos: () => Tratamiento[];
  guardar: () => void;
  error: () => string | null;
}

describe('PlanEdit', () => {
  let fixture: ComponentFixture<PlanEdit>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const cerrar = vi.fn();

  function montar(rol: string): void {
    localStorage.setItem('dentalcite.token', sesionCon(rol));
    const datos: PlanEditDatos = { pacienteId: 'fic-1', pacienteNombre: 'Ramos, Julio' };

    TestBed.configureTestingModule({
      imports: [PlanEdit],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlanEdit);
    componente = fixture.componentInstance as unknown as Interno;

    httpMock.expectOne((r) => r.url === API_TRATAMIENTOS).flush(pagina(TRATAMIENTOS));
    if (rol === 'ADMINISTRADOR') {
      httpMock.expectOne((r) => r.url === API_ODONTOLOGOS).flush(pagina(ODONTOLOGOS));
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    cerrar.mockClear();
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('descarta del selector los tratamientos dados de baja', () => {
    montar('ODONTOLOGO');

    expect(componente.tratamientos().map((t) => t.id)).toEqual(['tra-1']);
  });

  it('como odontologo no pide la lista de odontologos ni pinta el selector', () => {
    // Planifica en su propio nombre: el campo no existe para el.
    montar('ODONTOLOGO');

    expect(componente.planificaParaOtro()).toBe(false);
    httpMock.verify();
  });

  it('como odontologo envia el plan sin odontologoId', () => {
    // El servidor responde 403 a un ODONTOLOGO que lo mande, aunque sea el suyo.
    montar('ODONTOLOGO');
    componente.formulario.patchValue({ tratamientoId: 'tra-1', sesionesPrevistas: 6 });

    componente.guardar();

    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      pacienteId: 'fic-1',
      tratamientoId: 'tra-1',
      sesionesPrevistas: 6,
    });
    expect(Object.keys(req.request.body)).not.toContain('odontologoId');
    req.flush(PLAN);
  });

  it('como administrador envia el odontologo elegido', () => {
    montar('ADMINISTRADOR');
    componente.formulario.patchValue({
      odontologoId: 'odo-1',
      tratamientoId: 'tra-1',
      sesionesPrevistas: 4,
    });

    componente.guardar();

    const req = httpMock.expectOne(API);
    expect(req.request.body).toEqual({
      pacienteId: 'fic-1',
      tratamientoId: 'tra-1',
      sesionesPrevistas: 4,
      odontologoId: 'odo-1',
    });
    req.flush(PLAN);
  });

  it('como administrador el formulario no vale sin odontologo', () => {
    montar('ADMINISTRADOR');
    componente.formulario.patchValue({ tratamientoId: 'tra-1', sesionesPrevistas: 4 });

    expect(componente.formulario.invalid).toBe(true);
  });

  it('no envia nada con cero sesiones', () => {
    montar('ODONTOLOGO');
    componente.formulario.patchValue({ tratamientoId: 'tra-1', sesionesPrevistas: 0 });

    componente.guardar();

    httpMock.verify();
  });

  it('al crear cierra el dialogo devolviendo el plan', () => {
    montar('ODONTOLOGO');
    componente.formulario.patchValue({ tratamientoId: 'tra-1', sesionesPrevistas: 6 });

    componente.guardar();
    httpMock.expectOne(API).flush(PLAN);

    expect(cerrar).toHaveBeenCalledWith(PLAN);
  });

  it('RN-13: ante el 409 muestra el motivo y no cierra el dialogo', () => {
    // El mensaje dice que hay que suspender el plan en curso: quien planifica
    // necesita leerlo para saber que hacer.
    montar('ODONTOLOGO');
    componente.formulario.patchValue({ tratamientoId: 'tra-1', sesionesPrevistas: 6 });

    componente.guardar();
    httpMock.expectOne(API).flush(
      { message: 'El paciente ya tiene un plan activo de Ortodoncia (RN-13).' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(cerrar).not.toHaveBeenCalled();
    expect(componente.error()).toContain('RN-13');
  });

  it('dice para quien es el plan', () => {
    montar('ODONTOLOGO');

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ramos, Julio');
  });
});
