import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/api.types';
import { Cita, CitaResumen } from '../../models';
import { PendientesCierre } from './pendientes-cierre';

const API = `${environment.apiUrl}/api/v1/citas/pendientes-cierre`;

registerLocaleData(localeEsPe);

function cita(id: string): CitaResumen {
  return {
    id,
    codigo: `CIT-00000${id.slice(-1)}`,
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
}

function cerrada(id: string, sesionEnlazada?: Cita['sesionEnlazada']): Cita {
  return {
    id,
    codigo: `CIT-00000${id.slice(-1)}`,
    fecha: '2026-09-01',
    hora: '09:00:00',
    duracionMinutos: 30,
    zonaHoraria: 'America/Lima',
    estado: 'ATENDIDA',
    tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
    odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
    consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
    ...(sesionEnlazada ? { sesionEnlazada } : {}),
  };
}

function pagina(content: CitaResumen[]): PageResponse<CitaResumen> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

interface Interno {
  citas: () => CitaResumen[];
  registrar: (c: CitaResumen) => void;
}

describe('PendientesCierre', () => {
  let fixture: ComponentFixture<PendientesCierre>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const abiertos: unknown[] = [];
  const avisos = vi.fn();

  async function montar(citas: CitaResumen[], cierraCon: Cita | false = cerrada('c-1')): Promise<void> {
    TestBed.resetTestingModule();
    abiertos.length = 0;
    avisos.mockClear();
    const dialogoDoble = {
      open: (comp: unknown, config?: { data?: unknown }) => {
        abiertos.push(config?.data);
        return { afterClosed: () => of(cierraCon) };
      },
    };
    TestBed.configureTestingModule({
      imports: [PendientesCierre],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
        { provide: MatDialog, useValue: dialogoDoble },
        { provide: MatSnackBar, useValue: { open: avisos } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PendientesCierre);
    componente = fixture.componentInstance as unknown as Interno;

    httpMock.expectOne((r) => r.url === API).flush(pagina(citas));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('pide la cola sin ningun filtro: quien ve que lo decide el rol', async () => {
    await montar([cita('c-1')]);

    expect(componente.citas().map((c) => c.id)).toEqual(['c-1']);
  });

  it('pinta una fila por cita, con su paciente', async () => {
    await montar([cita('c-1')]);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Julio Ramos');
    expect(texto).toContain('HC-00042');
  });

  it('ofrece registrar el resultado de cada fila', async () => {
    await montar([cita('c-1')]);

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('button[aria-label^="Registrar el resultado"]')).not.toBeNull();
  });

  it('con la cola vacia lo dice en vez de dejar la tabla en blanco', async () => {
    await montar([]);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No queda ninguna cita pendiente de cierre',
    );
  });

  it('tras registrar el resultado vuelve a pedir la cola', async () => {
    await montar([cita('c-1')]);

    componente.registrar(componente.citas()[0]);
    await fixture.whenStable();

    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
  });

  it('si se cierra el dialogo sin registrar, no vuelve a pedir la cola', async () => {
    await montar([cita('c-1')], false);

    componente.registrar(componente.citas()[0]);
    await fixture.whenStable();

    httpMock.verify();
  });

  it('tras registrar avisa de la sesion del plan que ha ocupado la cita', async () => {
    await montar(
      [cita('c-1')],
      cerrada('c-1', { planId: 'plan-1', numero: 2, tratamiento: 'Endodoncia' }),
    );

    componente.registrar(componente.citas()[0]);
    await fixture.whenStable();
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));

    expect(avisos).toHaveBeenCalledWith(
      'Resultado de CIT-000001 registrado. Ocupa la sesión 2 de su plan de Endodoncia.',
      'Cerrar',
      { duration: 6000 },
    );
  });

  it('si la cita no ha ocupado ninguna sesion, el aviso no habla de planes', async () => {
    await montar([cita('c-1')]);

    componente.registrar(componente.citas()[0]);
    await fixture.whenStable();
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));

    expect(avisos).toHaveBeenCalledWith('Resultado de CIT-000001 registrado.', 'Cerrar', {
      duration: 6000,
    });
  });
});
