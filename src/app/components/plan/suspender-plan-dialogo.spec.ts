import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { Plan } from '../../models';
import { SuspenderPlanDatos, SuspenderPlanDialogo } from './suspender-plan-dialogo';

const PLAN: Plan = {
  id: 'plan-1',
  paciente: { id: 'fic-1', nombre: 'Ramos, Julio' },
  tratamiento: { id: 'tra-1', nombre: 'Ortodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  sesionesPrevistas: 6,
  activo: true,
  motivoSuspension: null,
  creadoEn: '2026-09-01T09:00:00Z',
  sesiones: [1, 2, 3, 4, 5, 6].map((numero) => ({
    id: `ses-${numero}`,
    numero,
    estado: 'PENDIENTE' as const,
  })),
};

const API = `${environment.apiUrl}/api/v1/planes/${PLAN.id}/suspender`;

interface Interno {
  motivo: string;
  suspender: () => void;
  error: () => string | null;
}

describe('SuspenderPlanDialogo', () => {
  let fixture: ComponentFixture<SuspenderPlanDialogo>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const cerrar = vi.fn();

  function montar(): void {
    const datos: SuspenderPlanDatos = { plan: PLAN };
    TestBed.configureTestingModule({
      imports: [SuspenderPlanDialogo],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SuspenderPlanDialogo);
    componente = fixture.componentInstance as unknown as Interno;
    fixture.detectChanges();
  }

  beforeEach(() => {
    cerrar.mockClear();
    TestBed.resetTestingModule();
  });

  it('sin motivo no envia nada', () => {
    // El criterio dice «lo suspenda indicando motivo»: el 400 del servidor es la
    // red, no el camino normal.
    montar();

    componente.suspender();

    httpMock.verify();
  });

  it('con solo espacios tampoco', () => {
    montar();
    componente.motivo = '   ';

    componente.suspender();

    httpMock.verify();
  });

  it('envia el motivo recortado', () => {
    montar();
    componente.motivo = '  El paciente se muda de ciudad  ';

    componente.suspender();

    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ motivo: 'El paciente se muda de ciudad' });
    req.flush({ ...PLAN, activo: false, motivoSuspension: 'El paciente se muda de ciudad' });
  });

  it('al suspender cierra el dialogo devolviendo el plan suspendido', () => {
    montar();
    componente.motivo = 'Se replantea';

    componente.suspender();
    const suspendido = { ...PLAN, activo: false, motivoSuspension: 'Se replantea' };
    httpMock.expectOne(API).flush(suspendido);

    expect(cerrar).toHaveBeenCalledWith(suspendido);
  });

  it('ante el 403 de un plan ajeno muestra el motivo y no cierra', () => {
    montar();
    componente.motivo = 'Motivo';

    componente.suspender();
    httpMock.expectOne(API).flush(
      { message: 'Este plan lo creó otro odontólogo (RNF-04).' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(cerrar).not.toHaveBeenCalled();
    expect(componente.error()).toContain('otro odontólogo');
  });

  it('dice que el tratamiento volvera a poder planificarse', () => {
    // Es el efecto que el odontologo busca al replantear un plan, y no verlo
    // escrito obliga a deducirlo.
    montar();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ortodoncia');
    expect(texto).toContain('volver a planificarse');
  });
});
