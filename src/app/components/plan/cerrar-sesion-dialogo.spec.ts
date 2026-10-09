import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { Plan, PlanSesion, Recomendacion } from '../../models';
import { CerrarSesionDatos, CerrarSesionDialogo } from './cerrar-sesion-dialogo';

const CATALOGO: Recomendacion[] = [
  { id: 'rec-1', descripcion: 'Mantener dieta blanda' },
  { id: 'rec-2', descripcion: 'Aplicar hielo en la mejilla' },
];

function sesion(numero: number, estado: PlanSesion['estado']): PlanSesion {
  return {
    id: `ses-${numero}`,
    numero,
    estado,
    cita:
      estado === 'PENDIENTE'
        ? null
        : { id: `cit-${numero}`, codigo: `CIT-00000${numero}`, inicio: '2026-09-01T09:00:00-05:00' },
    recomendaciones: [],
    proximoControl: null,
    observacion: null,
  };
}

const PLAN: Plan = {
  id: 'plan-1',
  paciente: { id: 'fic-1', nombre: 'Ramos, Julio' },
  tratamiento: { id: 'tra-1', nombre: 'Ortodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  sesionesPrevistas: 3,
  activo: true,
  motivoSuspension: null,
  creadoEn: '2026-09-01T09:00:00Z',
  avance: { completadas: 1, pendientes: 2 },
  sesiones: [sesion(1, 'ATENDIDA'), sesion(2, 'PENDIENTE'), sesion(3, 'PENDIENTE')],
};

const CATALOGO_URL = `${environment.apiUrl}/api/v1/recomendaciones`;
const CIERRE_URL = `${environment.apiUrl}/api/v1/planes/${PLAN.id}/sesiones/1/cierre`;

interface Interno {
  elegidas: () => string[];
  alternar: (r: Recomendacion) => void;
  proximoControl: Date | null;
  observacion: string;
  sePuedeEnviar: () => boolean;
  guardar: () => void;
  error: () => string | null;
}

describe('CerrarSesionDialogo', () => {
  let fixture: ComponentFixture<CerrarSesionDialogo>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const cerrar = vi.fn();

  function montar(): void {
    const datos: CerrarSesionDatos = { plan: PLAN, sesion: PLAN.sesiones[0] };
    TestBed.configureTestingModule({
      imports: [CerrarSesionDialogo],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CerrarSesionDialogo);
    componente = fixture.componentInstance as unknown as Interno;
    fixture.detectChanges();
    httpMock.expectOne(CATALOGO_URL).flush(CATALOGO);
    fixture.detectChanges();
  }

  beforeEach(() => {
    cerrar.mockClear();
    TestBed.resetTestingModule();
  });

  it('pinta el catalogo cerrado para elegir de el', () => {
    montar();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Mantener dieta blanda');
    expect(texto).toContain('Aplicar hielo en la mejilla');
  });

  it('sin ninguna recomendacion no deja enviar', () => {
    montar();
    componente.proximoControl = new Date(2026, 9, 15);

    expect(componente.sePuedeEnviar()).toBe(false);
    componente.guardar();

    httpMock.verify();
  });

  it('sin fecha de proximo control tampoco', () => {
    montar();
    componente.alternar(CATALOGO[0]);

    expect(componente.sePuedeEnviar()).toBe(false);
    componente.guardar();

    httpMock.verify();
  });

  it('eligiendo primero la recomendacion y despues la fecha habilita el boton', () => {
    montar();
    componente.alternar(CATALOGO[0]);
    fixture.detectChanges();
    expect(componente.sePuedeEnviar()).toBe(false);

    componente.proximoControl = new Date(2026, 9, 15);

    expect(componente.sePuedeEnviar()).toBe(true);
  });

  it('envia lo elegido con la fecha local, no la de UTC', () => {
    montar();
    componente.alternar(CATALOGO[0]);
    componente.alternar(CATALOGO[1]);
    componente.proximoControl = new Date(2026, 9, 15);
    componente.observacion = '  Volver antes si hay dolor  ';

    componente.guardar();

    const req = httpMock.expectOne(CIERRE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      recomendacionIds: ['rec-1', 'rec-2'],
      proximoControl: '2026-10-15',
      observacion: 'Volver antes si hay dolor',
    });
    req.flush(PLAN);
  });

  it('con la observacion en blanco no manda el campo', () => {
    montar();
    componente.alternar(CATALOGO[0]);
    componente.proximoControl = new Date(2026, 9, 15);
    componente.observacion = '   ';

    componente.guardar();

    const req = httpMock.expectOne(CIERRE_URL);
    expect(req.request.body).toEqual({
      recomendacionIds: ['rec-1'],
      proximoControl: '2026-10-15',
    });
    req.flush(PLAN);
  });

  it('al elegir dos veces la misma la quita', () => {
    montar();
    componente.alternar(CATALOGO[0]);
    componente.alternar(CATALOGO[0]);

    expect(componente.elegidas()).toEqual([]);
  });

  it('al cerrar devuelve el plan con la sesion ya cerrada', () => {
    montar();
    componente.alternar(CATALOGO[0]);
    componente.proximoControl = new Date(2026, 9, 15);

    componente.guardar();
    const cerrada: Plan = {
      ...PLAN,
      sesiones: [
        {
          ...PLAN.sesiones[0],
          estado: 'CERRADA',
          recomendaciones: [CATALOGO[0]],
          proximoControl: '2026-10-15',
          observacion: null,
        },
        PLAN.sesiones[1],
        PLAN.sesiones[2],
      ],
    };
    httpMock.expectOne(CIERRE_URL).flush(cerrada);

    expect(cerrar).toHaveBeenCalledWith(cerrada);
  });

  it('ante el 409 de una sesion ya cerrada muestra el motivo y no cierra', () => {
    montar();
    componente.alternar(CATALOGO[0]);
    componente.proximoControl = new Date(2026, 9, 15);

    componente.guardar();
    httpMock
      .expectOne(CIERRE_URL)
      .flush({ message: 'La sesion 1 ya se cerro.' }, { status: 409, statusText: 'Conflict' });

    expect(cerrar).not.toHaveBeenCalled();
    expect(componente.error()).toContain('ya se cerro');
  });

  it('advierte que la observacion no es una indicacion clinica', () => {
    montar();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('no una indicación clínica');
  });
});
