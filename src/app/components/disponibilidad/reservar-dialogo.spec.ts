import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { Cita } from '../../models';
import { BloqueAgrupado } from './agrupar-franjas';
import { ReservarDialogo, ReservarDialogoDatos } from './reservar-dialogo';

const API = `${environment.apiUrl}/api/v1/citas`;

registerLocaleData(localeEsPe);

/** Un bloque de 30 min con dos odontólogos y horas exactas distintas. */
const BLOQUE: BloqueAgrupado = {
  inicio: '09:00',
  inicios: ['09:00', '09:15'],
  odontologos: [
    { id: 'odo-1', nombre: 'Luis Pérez', inicios: ['09:00', '09:15'] },
    { id: 'odo-2', nombre: 'Ana Ruiz', inicios: ['09:15'] },
  ],
};

const CITA: Cita = {
  id: 'cita-1',
  codigo: 'CIT-000123',
  fecha: '2026-10-12',
  hora: '09:00:00',
  duracionMinutos: 30,
  zonaHoraria: 'America/Lima',
  estado: 'CONFIRMADA',
  tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
};

interface Interno {
  odontologoElegido: string;
  horaElegida: string;
  horasDisponibles: () => string[];
  cambiarOdontologo: () => void;
  confirmar: () => void;
  error: () => string | null;
}

describe('ReservarDialogo', () => {
  let fixture: ComponentFixture<ReservarDialogo>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const cerrar = vi.fn();

  function montar(bloque: BloqueAgrupado = BLOQUE): void {
    const datos: ReservarDialogoDatos = {
      tratamientoId: 'tra-1',
      tratamientoNombre: 'Endodoncia',
      duracionMinutos: 30,
      fecha: '2026-10-12',
      bloque,
    };

    TestBed.configureTestingModule({
      imports: [ReservarDialogo],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
        { provide: MAT_DIALOG_DATA, useValue: datos },
        // No hay precedente de test con MatDialog en el repo: se prueba el
        // componente directo con un doble de su referencia, que es mas simple y
        // no depende del overlay.
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReservarDialogo);
    componente = fixture.componentInstance as unknown as Interno;
    fixture.detectChanges();
  }

  beforeEach(() => {
    cerrar.mockClear();
    TestBed.resetTestingModule();
  });

  it('preselecciona el primer odontologo y su primera hora', () => {
    montar();

    expect(componente.odontologoElegido).toBe('odo-1');
    expect(componente.horaElegida).toBe('09:00');
  });

  it('ofrece las horas exactas del odontologo elegido, no las del bloque', () => {
    // Ana solo tiene las 09:15 dentro de este bloque de 30 minutos.
    montar();
    componente.odontologoElegido = 'odo-2';
    componente.cambiarOdontologo();

    expect(componente.horasDisponibles()).toEqual(['09:15']);
  });

  it('al cambiar de odontologo corrige una hora que este ya no ofrece', () => {
    montar();
    expect(componente.horaElegida).toBe('09:00');

    componente.odontologoElegido = 'odo-2';
    componente.cambiarOdontologo();

    expect(componente.horaElegida).toBe('09:15');
  });

  it('envia fecha y hora, y no envia paciente', async () => {
    // HU-14: el paciente sale del token. Que el cuerpo no lo lleve es lo que
    // impide reservar en nombre de otro.
    montar();
    componente.confirmar();

    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      tratamientoId: 'tra-1',
      odontologoId: 'odo-1',
      fecha: '2026-10-12',
      hora: '09:00',
    });
    expect(Object.keys(req.request.body)).not.toContain('pacienteId');
    req.flush(CITA);
  });

  it('al reservar cierra el dialogo devolviendo la cita', () => {
    montar();
    componente.confirmar();
    httpMock.expectOne(API).flush(CITA);

    expect(cerrar).toHaveBeenCalledWith({ cita: CITA });
  });

  it('muestra dentro del dialogo el 422 de la ventana de reserva', async () => {
    // RN-05. El dialogo no se cierra: cerrarlo obligaria a rehacer la eleccion.
    montar();
    componente.confirmar();

    httpMock
      .expectOne(API)
      .flush(
        { message: 'La cita debe reservarse con al menos 2 horas de antelación (RN-05).' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await fixture.whenStable();

    expect(componente.error()).toContain('2 horas de antelación');
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('HU-10: el 409 cierra el dialogo pidiendo recalcular la disponibilidad', async () => {
    // RF-16: la franja se ocupo entre la consulta y la confirmacion. Seguir
    // mirando la lista vieja es peor que refrescarla.
    montar();
    componente.confirmar();

    httpMock
      .expectOne(API)
      .flush(
        { message: 'Otro paciente está reservando esa misma franja en este momento.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(cerrar).toHaveBeenCalledWith({
      recargar: 'Otro paciente está reservando esa misma franja en este momento.',
    });
  });

  it('la cuota agotada tambien cierra y recarga, porque el estado cambio', async () => {
    montar();
    componente.confirmar();

    httpMock
      .expectOne(API)
      .flush(
        { message: 'Ya tienes 3 citas activas, el máximo permitido (RN-07).' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(cerrar).toHaveBeenCalledWith({
      recargar: 'Ya tienes 3 citas activas, el máximo permitido (RN-07).',
    });
  });

  it('con un solo odontologo y una sola hora no pide elegir nada', () => {
    montar({
      inicio: '10:00',
      inicios: ['10:00'],
      odontologos: [{ id: 'odo-1', nombre: 'Luis Pérez', inicios: ['10:00'] }],
    });

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('mat-radio-group')).toHaveLength(0);
    expect(raiz.textContent).toContain('Luis Pérez');
    expect(raiz.textContent).toContain('10:00');
  });
});
