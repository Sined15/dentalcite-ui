import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { CitaResumen } from '../../models';
import { CancelarDialogo, CancelarDialogoDatos } from './cancelar-dialogo';

const API = `${environment.apiUrl}/api/v1/citas`;

const CITA: CitaResumen = {
  id: 'cita-1',
  codigo: 'CIT-000123',
  fecha: '2026-10-12',
  hora: '09:00:00',
  duracionMinutos: 30,
  zonaHoraria: 'America/Lima',
  estado: 'CONFIRMADA',
  motivoCancelacion: null,
  cancelablePorPaciente: true,
  paciente: { fichaId: 'fic-1', nombre: 'Ana Torres', numeroHistoria: 'HC-00042' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
  consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
};

interface Interno {
  motivo: string;
  cancelarCita: () => void;
  cerrar: () => void;
  error: () => string | null;
  enviando: () => boolean;
}

describe('CancelarDialogo', () => {
  let fixture: ComponentFixture<CancelarDialogo>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const cerrar = vi.fn();

  function montar(mostrarPaciente = true): void {
    const datos: CancelarDialogoDatos = { cita: CITA, mostrarPaciente };
    TestBed.configureTestingModule({
      imports: [CancelarDialogo],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CancelarDialogo);
    componente = fixture.componentInstance as unknown as Interno;
    fixture.detectChanges();
  }

  beforeEach(() => {
    cerrar.mockClear();
    TestBed.resetTestingModule();
  });

  it('RF-20: envia el motivo al cancelar y cierra confirmando', () => {
    montar();
    componente.motivo = 'El paciente reprograma';
    componente.cancelarCita();

    const req = httpMock.expectOne(`${API}/cita-1/cancelar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ motivo: 'El paciente reprograma' });
    req.flush({ ...CITA, estado: 'CANCELADA' });

    expect(cerrar).toHaveBeenCalledWith(true);
  });

  it('recorta el motivo antes de enviarlo', () => {
    montar();
    componente.motivo = '  El paciente reprograma  ';
    componente.cancelarCita();

    expect(httpMock.expectOne(`${API}/cita-1/cancelar`).request.body).toEqual({
      motivo: 'El paciente reprograma',
    });
  });

  it('sin motivo no llega a salir', () => {
    montar();
    componente.motivo = '   ';
    componente.cancelarCita();

    httpMock.verify();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('el boton esta deshabilitado mientras no haya motivo', () => {
    montar();
    const raiz = fixture.nativeElement as HTMLElement;
    const boton = [...raiz.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Cancelar la cita'),
    ) as HTMLButtonElement;

    expect(boton.disabled).toBe(true);
  });

  it('el 409 se muestra sin cerrar el dialogo', () => {
    montar();
    componente.motivo = 'El paciente reprograma';
    componente.cancelarCita();

    httpMock.expectOne(`${API}/cita-1/cancelar`).flush(
      { message: 'La cita CIT-000123 ya esta en estado CANCELADA y no puede cancelarse (RN-09).' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(cerrar).not.toHaveBeenCalled();
    expect(componente.error()).toContain('ya esta en estado CANCELADA');
    expect(componente.enviando()).toBe(false);
  });

  it('el 404 tambien se muestra sin cerrar', () => {
    montar();
    componente.motivo = 'Motivo';
    componente.cancelarCita();

    httpMock.expectOne(`${API}/cita-1/cancelar`).flush(
      { message: 'Cita no encontrada' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(componente.error()).toBe('Cita no encontrada');
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('volver cierra sin cancelar nada', () => {
    montar();
    componente.cerrar();

    expect(cerrar).toHaveBeenCalledWith(false);
    httpMock.verify();
  });

  it('HU-15: cancelando la propia, no nombra al paciente', () => {
    montar(false);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('CIT-000123');
    expect(texto).not.toContain('Ana Torres');
  });

  it('muestra a quien y cuando se esta cancelando', () => {
    montar();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('CIT-000123');
    expect(texto).toContain('Ana Torres');
    expect(texto).toContain('09:00');
    expect(texto).toContain('Luis Pérez');
  });
});
