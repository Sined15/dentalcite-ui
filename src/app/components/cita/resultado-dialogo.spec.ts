import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { Cita, CitaResumen } from '../../models';
import { avisoDeResultado, ResultadoDialogo, ResultadoDialogoDatos } from './resultado-dialogo';

const API = `${environment.apiUrl}/api/v1/citas`;

const CITA: CitaResumen = {
  id: 'cita-1',
  codigo: 'CIT-000123',
  fecha: '2026-09-01',
  hora: '09:00:00',
  duracionMinutos: 30,
  zonaHoraria: 'America/Lima',
  estado: 'CONFIRMADA',
  motivoCancelacion: null,
  cancelablePorPaciente: false,
  paciente: { fichaId: 'fic-1', nombre: 'Julio Ramos', numeroHistoria: 'HC-00042' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
  consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
};

const CERRADA: Cita = {
  id: 'cita-1',
  codigo: 'CIT-000123',
  fecha: '2026-09-01',
  hora: '09:00:00',
  duracionMinutos: 30,
  zonaHoraria: 'America/Lima',
  estado: 'ATENDIDA',
  tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
};

interface Interno {
  resultado: string;
  registrar: () => void;
  error: () => string | null;
}

describe('ResultadoDialogo', () => {
  let fixture: ComponentFixture<ResultadoDialogo>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const cerrar = vi.fn();

  function montar(): void {
    const datos: ResultadoDialogoDatos = { cita: CITA };
    TestBed.configureTestingModule({
      imports: [ResultadoDialogo],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResultadoDialogo);
    componente = fixture.componentInstance as unknown as Interno;
    fixture.detectChanges();
  }

  beforeEach(() => {
    cerrar.mockClear();
    TestBed.resetTestingModule();
  });

  it('no trae ningun resultado preseleccionado', () => {
    montar();

    expect(componente.resultado).toBe('');
  });

  it('sin elegir resultado no envia nada', () => {
    montar();

    componente.registrar();

    httpMock.verify();
  });

  it('envia el resultado elegido al endpoint de la cita', () => {
    montar();
    componente.resultado = 'NO_ASISTIO';

    componente.registrar();

    const req = httpMock.expectOne(`${API}/cita-1/resultado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ resultado: 'NO_ASISTIO' });
    req.flush(CERRADA);
  });

  it('al registrar cierra el dialogo con la cita que devuelve el servidor', () => {
    montar();
    componente.resultado = 'ATENDIDA';

    componente.registrar();
    httpMock.expectOne(`${API}/cita-1/resultado`).flush(CERRADA);

    expect(cerrar).toHaveBeenCalledWith(CERRADA);
  });

  it('ante un 409 muestra el motivo y no cierra el dialogo', () => {
    montar();
    componente.resultado = 'ATENDIDA';

    componente.registrar();
    httpMock
      .expectOne(`${API}/cita-1/resultado`)
      .flush({ message: 'La cita CIT-000123 todavia no ha terminado' }, { status: 409, statusText: 'Conflict' });

    expect(cerrar).not.toHaveBeenCalled();
    expect(componente.error()).toContain('todavia no ha terminado');
  });

  it('muestra de quien es la cita que se esta cerrando', () => {
    montar();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('CIT-000123');
    expect(texto).toContain('Julio Ramos');
  });
});

describe('avisoDeResultado', () => {
  it('si la cita ha ocupado una sesion, dice cual y de que plan', () => {
    const conSesion: Cita = {
      ...CERRADA,
      sesionEnlazada: { planId: 'plan-1', numero: 2, tratamiento: 'Endodoncia' },
    };

    expect(avisoDeResultado(conSesion)).toBe(
      'Resultado de CIT-000123 registrado. Ocupa la sesión 2 de su plan de Endodoncia.',
    );
  });

  it('si no ha ocupado ninguna, no habla de planes', () => {
    expect(avisoDeResultado(CERRADA)).toBe('Resultado de CIT-000123 registrado.');
  });
});
