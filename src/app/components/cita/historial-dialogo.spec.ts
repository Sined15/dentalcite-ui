import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { CitaHistorial, CitaResumen } from '../../models';
import { HistorialDialogo, HistorialDialogoDatos } from './historial-dialogo';

const API = `${environment.apiUrl}/api/v1/citas`;

const CITA: CitaResumen = {
  id: 'cita-1',
  codigo: 'CIT-000123',
  fecha: '2026-10-12',
  hora: '09:00:00',
  duracionMinutos: 30,
  zonaHoraria: 'America/Lima',
  estado: 'CANCELADA',
  motivoCancelacion: 'El paciente reprograma',
  paciente: { fichaId: 'fic-1', nombre: 'Ana Torres', numeroHistoria: 'HC-00042' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
  consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
};

const CANCELACION: CitaHistorial = {
  id: 'his-1',
  estadoAnterior: 'CONFIRMADA',
  estadoNuevo: 'CANCELADA',
  motivo: 'El paciente reprograma',
  ocurridoEn: '2026-10-11T14:30:00-05:00',
  responsable: {
    id: 'usr-1',
    nombre: 'Rosa Díaz',
    correo: 'recepcion@dentalcite.com',
    rol: 'RECEPCIONISTA',
  },
};

describe('HistorialDialogo', () => {
  let fixture: ComponentFixture<HistorialDialogo>;
  let httpMock: HttpTestingController;

  function montar(): void {
    const datos: HistorialDialogoDatos = { cita: CITA };
    TestBed.configureTestingModule({
      imports: [HistorialDialogo],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HistorialDialogo);
    fixture.detectChanges();
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('RF-21: pide la bitacora de la cita al abrirse', () => {
    montar();
    const req = httpMock.expectOne(`${API}/cita-1/historial`);

    expect(req.request.method).toBe('GET');
    req.flush([CANCELACION]);
  });

  it('muestra la transicion con su responsable y su motivo', () => {
    // Los tres datos que RF-21 exige que consten: que paso, quien lo ordeno y
    // por que. Sin ellos la bitacora no sirve para auditar nada.
    montar();
    httpMock.expectOne(`${API}/cita-1/historial`).flush([CANCELACION]);
    fixture.detectChanges();

    expect(texto()).toContain('CONFIRMADA');
    expect(texto()).toContain('CANCELADA');
    expect(texto()).toContain('Rosa Díaz');
    expect(texto()).toContain('RECEPCIONISTA');
    expect(texto()).toContain('El paciente reprograma');
  });

  it('la transicion sin estado anterior se lee como el alta', () => {
    montar();
    httpMock.expectOne(`${API}/cita-1/historial`).flush([
      { ...CANCELACION, id: 'his-0', estadoAnterior: null, estadoNuevo: 'CONFIRMADA', motivo: null },
    ]);
    fixture.detectChanges();

    expect(texto()).toContain('Cita creada');
  });

  it('conserva el orden en que llegan las transiciones', () => {
    // La bitacora vale por el orden: el servidor la devuelve de la mas antigua a
    // la mas reciente y el dialogo no la reordena.
    montar();
    httpMock.expectOne(`${API}/cita-1/historial`).flush([
      { ...CANCELACION, id: 'his-0', estadoAnterior: null, estadoNuevo: 'CONFIRMADA', motivo: null },
      CANCELACION,
    ]);
    fixture.detectChanges();

    const pasos = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('.linea li .estado'),
    ].map((p) => p.textContent?.trim());

    expect(pasos.length).toBe(2);
    expect(pasos[0]).toContain('Cita creada');
    expect(pasos[1]).toContain('CANCELADA');
  });

  it('el error se muestra en lugar de la linea de tiempo', () => {
    montar();
    httpMock
      .expectOne(`${API}/cita-1/historial`)
      .flush({ message: 'Cita no encontrada' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('[role="alert"]')?.textContent).toContain('Cita no encontrada');
    expect(raiz.querySelector('.linea')).toBeNull();
  });
});
