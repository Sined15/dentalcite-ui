import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/api.types';
import { CitaResumen } from '../../models';
import { MisCitas } from './mis-citas';

const API = `${environment.apiUrl}/api/v1/citas/mias`;

registerLocaleData(localeEsPe);

/** "YYYY-MM-DD" de hoy más `dias`, en hora local y sin pasar por UTC. */
function fechaLocal(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function cita(
  id: string,
  dias: number,
  estado: CitaResumen['estado'] = 'CONFIRMADA',
  cancelable = true,
): CitaResumen {
  return {
    id,
    codigo: `CIT-00000${id.slice(-1)}`,
    fecha: fechaLocal(dias),
    hora: '09:00:00',
    duracionMinutos: 30,
    zonaHoraria: 'America/Lima',
    estado,
    motivoCancelacion: estado === 'CANCELADA' ? 'Ya no podia asistir' : null,
    cancelablePorPaciente: cancelable,
    paciente: { fichaId: 'fic-1', nombre: 'Ana Torres', numeroHistoria: 'HC-00042' },
    odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
    tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
    consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
  };
}

function pagina(content: CitaResumen[]): PageResponse<CitaResumen> {
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

interface Interno {
  futuras: () => CitaResumen[];
  pasadas: () => CitaResumen[];
  cancelar: (c: CitaResumen) => void;
  etiquetaEstado: (estado: string) => string;
}

describe('MisCitas', () => {
  let fixture: ComponentFixture<MisCitas>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const abiertos: unknown[] = [];

  async function montar(
    citas: CitaResumen[],
    cierraCon = true,
  ): Promise<void> {
    TestBed.resetTestingModule();
    abiertos.length = 0;
    const dialogoDoble = {
      open: (comp: unknown, config?: { data?: unknown }) => {
        abiertos.push(config?.data);
        return { afterClosed: () => of(cierraCon) };
      },
    };
    TestBed.configureTestingModule({
      imports: [MisCitas],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
        { provide: MatDialog, useValue: dialogoDoble },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisCitas);
    componente = fixture.componentInstance as unknown as Interno;

    httpMock.expectOne((r) => r.url === API).flush(pagina(citas));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('no manda la ficha ni el rango: el servidor saca la ficha del token', async () => {
    // El criterio pide «las futuras y las pasadas», asi que no hay rango que
    // mandar; y mandar la ficha permitiria pedir las de otro.
    TestBed.configureTestingModule({
      imports: [MisCitas],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(false) }) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisCitas);

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('desde')).toBe(false);
    expect(req.request.params.has('hasta')).toBe(false);
    expect(req.request.params.has('pacienteId')).toBe(false);
    req.flush(pagina([]));
  });

  it('separa las futuras de las pasadas', async () => {
    await montar([cita('c-1', 7), cita('c-2', -30, 'ATENDIDA', false)]);

    expect(componente.futuras().map((c) => c.id)).toEqual(['c-1']);
    expect(componente.pasadas().map((c) => c.id)).toEqual(['c-2']);
  });

  it('ordena las proximas de la mas cercana a la mas lejana', async () => {
    // El servidor las devuelve de la mas reciente a la mas antigua; entre las
    // futuras eso deja la mas lejana primero, que no es lo que se quiere ver.
    await montar([cita('c-3', 30), cita('c-2', 14), cita('c-1', 2)]);

    expect(componente.futuras().map((c) => c.id)).toEqual(['c-1', 'c-2', 'c-3']);
  });

  it('pinta el boton de cancelar solo cuando el servidor lo permite', async () => {
    await montar([cita('c-1', 7, 'CONFIRMADA', true)]);

    const raiz = fixture.nativeElement as HTMLElement;
    const boton = raiz.querySelector('button[aria-label^="Cancelar"]');
    expect(boton).not.toBeNull();
  });

  it('RN-06: fuera de la ventana no pinta el boton y dice a donde acudir', async () => {
    // Un boton deshabilitado sin explicacion obliga a llamar para averiguar por
    // que; el aviso lo dice antes.
    await montar([cita('c-1', 1, 'CONFIRMADA', false)]);

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('button[aria-label^="Cancelar"]')).toBeNull();
    expect(raiz.textContent).toContain('recepción');
  });

  it('no ofrece cancelar una cita ya cancelada ni avisa de la ventana', async () => {
    await montar([cita('c-1', 7, 'CANCELADA', false)]);

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('button[aria-label^="Cancelar"]')).toBeNull();
    expect(raiz.textContent).not.toContain('Llama a la recepción');
  });

  it('al cancelar abre el dialogo sin nombrar al paciente', async () => {
    // Es quien esta mirando: decirselo sobra.
    await montar([cita('c-1', 7)]);

    componente.cancelar(componente.futuras()[0]);
    await fixture.whenStable();

    const datos = abiertos[0] as { mostrarPaciente?: boolean };
    expect(datos.mostrarPaciente).toBe(false);
  });

  it('tras cancelar vuelve a pedir la lista', async () => {
    // Cancelar una puede cambiar si las demas se pueden cancelar.
    await montar([cita('c-1', 7)]);

    componente.cancelar(componente.futuras()[0]);
    await fixture.whenStable();

    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
  });

  it('sin citas lo dice en vez de dejar la pantalla en blanco', async () => {
    await montar([]);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Todavía no tienes ninguna cita',
    );
  });

  it('traduce los estados de RN-09 a algo legible', async () => {
    await montar([]);

    expect(componente.etiquetaEstado('NO_ASISTIO')).toBe('No asististe');
    expect(componente.etiquetaEstado('ATENDIDA')).toBe('Atendida');
  });
});
