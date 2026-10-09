import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Cita } from '../../models';
import { CitaReservadaDialogo } from './cita-reservada-dialogo';

const CITA: Cita = {
  id: 'cita-1',
  codigo: 'CIT-000123',
  fecha: '2026-10-12',
  hora: '09:30:00',
  duracionMinutos: 45,
  zonaHoraria: 'America/Lima',
  estado: 'CONFIRMADA',
  tratamiento: { id: 'tra-1', nombre: 'Profilaxis dental' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
};

describe('CitaReservadaDialogo', () => {
  let fixture: ComponentFixture<CitaReservadaDialogo>;
  const escribir = vi.fn<(texto: string) => Promise<void>>();

  function montar(): void {
    TestBed.configureTestingModule({
      imports: [CitaReservadaDialogo],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: CITA },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(CitaReservadaDialogo);
    fixture.detectChanges();
  }

  function botonDeCopiar(): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      'button[aria-label^="Copiar"]',
    ) as HTMLButtonElement;
  }

  beforeEach(() => {
    escribir.mockReset();
    escribir.mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText: escribir } });
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('RF-15: el codigo unico se ve en pantalla', () => {
    montar();
    const codigo = (fixture.nativeElement as HTMLElement).querySelector('code');

    expect(codigo?.textContent).toContain('CIT-000123');
  });

  it('muestra con quien, cuando y donde queda la cita', () => {
    montar();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Profilaxis dental');
    expect(texto).toContain('45 min');
    expect(texto).toContain('09:30');
    expect(texto).not.toContain('09:30:00');
    expect(texto).toContain('Luis Pérez');
    expect(texto).toContain('Consultorio 2');
  });

  it('copiar lleva el codigo al portapapeles y lo acusa', async () => {
    montar();
    botonDeCopiar().click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(escribir).toHaveBeenCalledWith('CIT-000123');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('check');
  });

  it('si el portapapeles falla, no se acusa una copia que no ocurrio', async () => {
    escribir.mockRejectedValue(new Error('denegado'));
    montar();
    botonDeCopiar().click();
    await Promise.resolve();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('content_copy');
  });

  it('sin portapapeles disponible, el boton no rompe el dialogo', () => {
    vi.stubGlobal('navigator', {});
    montar();

    expect(() => botonDeCopiar().click()).not.toThrow();
    expect((fixture.nativeElement as HTMLElement).querySelector('code')?.textContent).toContain(
      'CIT-000123',
    );
  });
});
