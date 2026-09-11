import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/api.types';
import { CitaResumen, Especialidad, Odontologo } from '../../models';
import { Agenda } from './agenda';

const API = `${environment.apiUrl}/api/v1/citas`;
const API_ODONTOLOGOS = `${environment.apiUrl}/api/v1/odontologos`;

registerLocaleData(localeEsPe);

const ENDODONCIA: Especialidad = {
  id: 'esp-1',
  nombre: 'ENDODONCIA',
  descripcion: null,
  activo: true,
  imagenUrl: null,
};

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
  {
    id: 'odo-2',
    cop: 'COP-2',
    nombres: 'Baja',
    apellidos: 'Retirado',
    fichaId: 'fic-odo-2',
    activo: false,
    imagenUrl: null,
    especialidades: [ENDODONCIA],
  },
];

/** "YYYY-MM-DD" de hoy mas `dias`, en hora local y sin pasar por UTC. */
function fechaLocal(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function cita(id: string, hora: string, estado: CitaResumen['estado'] = 'CONFIRMADA'): CitaResumen {
  return {
    id,
    codigo: `CIT-00000${id.slice(-1)}`,
    fecha: '2026-10-12',
    hora,
    duracionMinutos: 30,
    zonaHoraria: 'America/Lima',
    estado,
    motivoCancelacion: estado === 'CANCELADA' ? 'El paciente reprograma' : null,
    cancelablePorPaciente: estado === 'CONFIRMADA',
    paciente: { fichaId: 'fic-1', nombre: 'Ana Torres', numeroHistoria: 'HC-00042' },
    odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
    tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
    consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
  };
}

function pagina<T>(content: T[], totalElements = content.length): PageResponse<T> {
  return {
    content,
    totalElements,
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
  formulario: {
    patchValue: (valores: Record<string, string>) => void;
    hasError: (codigo: string) => boolean;
    invalid: boolean;
  };
  citas: () => CitaResumen[];
  odontologos: () => Odontologo[];
  total: () => number;
  indice: () => number;
  consultar: () => void;
  cargar: () => void;
  cambiarPagina: (evento: { pageIndex: number; pageSize: number }) => void;
  cancelar: (cita: CitaResumen) => void;
  pendienteDeCierre: (cita: CitaResumen) => boolean;
  error: () => string | null;
  etiquetaEstado: (estado: CitaResumen['estado']) => string;
}

describe('Agenda', () => {
  let fixture: ComponentFixture<Agenda>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const abiertos: unknown[] = [];

  afterEach(() => localStorage.clear());

  /** @param cierraCon lo que devuelve el dialogo de cancelacion al cerrarse. */
  function montar(cierraCon = true): void {
    TestBed.resetTestingModule();
    abiertos.length = 0;
    const dialogoDoble = {
      open: (componenteAbierto: unknown) => {
        abiertos.push(componenteAbierto);
        return { afterClosed: () => of(cierraCon) };
      },
    };

    TestBed.configureTestingModule({
      imports: [Agenda],
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
    fixture = TestBed.createComponent(Agenda);
    componente = fixture.componentInstance as unknown as Interno;

    // El constructor carga el catalogo de odontologos y consulta la agenda de hoy.
    httpMock.expectOne((r) => r.url === API_ODONTOLOGOS).flush(pagina(ODONTOLOGOS));
  }

  beforeEach(() => montar());

  it('arranca consultando la agenda de hoy', async () => {
    const req = httpMock.expectOne((r) => r.url === API);
    const hoy = new Date();
    const esperado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
      hoy.getDate(),
    ).padStart(2, '0')}`;

    expect(req.request.params.get('desde')).toBe(esperado);
    expect(req.request.params.get('hasta')).toBe(esperado);
    req.flush(pagina([cita('cita-1', '09:00:00')]));
    await fixture.whenStable();

    expect(componente.citas()).toHaveLength(1);
  });

  it('descarta del selector los odontologos dados de baja', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
    await fixture.whenStable();

    expect(componente.odontologos().map((o) => o.id)).toEqual(['odo-1']);
  });

  it('omite los filtros vacios en vez de mandarlos en blanco', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
    await fixture.whenStable();

    componente.formulario.patchValue({ desde: '2026-10-12', hasta: '2026-10-12' });
    componente.consultar();

    const req = httpMock.expectOne((r) => r.url === API);
    // Vacio no significa «todos» para el servidor: el parametro no viaja.
    expect(req.request.params.has('odontologoId')).toBe(false);
    expect(req.request.params.has('estado')).toBe(false);
    req.flush(pagina([]));
  });

  it('RF-18: envia los filtros de odontologo y estado cuando se eligen', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
    await fixture.whenStable();

    componente.formulario.patchValue({
      desde: '2026-10-12',
      hasta: '2026-10-14',
      odontologoId: 'odo-1',
      estado: 'CANCELADA',
    });
    componente.consultar();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('desde')).toBe('2026-10-12');
    expect(req.request.params.get('hasta')).toBe('2026-10-14');
    expect(req.request.params.get('odontologoId')).toBe('odo-1');
    expect(req.request.params.get('estado')).toBe('CANCELADA');
    req.flush(pagina([]));
  });

  it('un rango invertido no llega a salir', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
    await fixture.whenStable();

    componente.formulario.patchValue({ desde: '2026-10-14', hasta: '2026-10-12' });
    expect(componente.formulario.hasError('rangoInvertido')).toBe(true);

    componente.consultar();
    // El servidor tambien lo rechaza, pero el viaje se ahorra.
    httpMock.verify();
  });

  it('pinta el paciente, la hora y el consultorio de cada cita', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([cita('cita-1', '09:30:00')]));
    await fixture.whenStable();
    fixture.detectChanges();

    // RF-18 nombra exactamente estos tres datos.
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('09:30');
    expect(texto).toContain('Ana Torres');
    expect(texto).toContain('HC-00042');
    expect(texto).toContain('Consultorio 2');
  });

  it('avisa cuando el rango no tiene ninguna cita', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.vacio')?.textContent).toContain('No hay citas');
  });

  it('la pagina se pide al servidor, no se corta en el navegador', async () => {
    // Una agenda crece sin techo: traerla entera dejaria de funcionar justo
    // cuando la clinica llevara tiempo operando.
    httpMock.expectOne((r) => r.url === API).flush(pagina([cita('cita-1', '09:00:00')], 120));
    await fixture.whenStable();
    expect(componente.total()).toBe(120);

    componente.cambiarPagina({ pageIndex: 2, pageSize: 20 });

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('20');
    req.flush(pagina([]));
  });

  it('consultar de nuevo vuelve a la primera pagina', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([], 120));
    await fixture.whenStable();

    componente.cambiarPagina({ pageIndex: 3, pageSize: 20 });
    httpMock.expectOne((r) => r.url === API).flush(pagina([], 120));
    await fixture.whenStable();
    expect(componente.indice()).toBe(3);

    componente.consultar();
    // La pagina 3 de otra busqueda no significa nada.
    expect(httpMock.expectOne((r) => r.url === API).request.params.get('page')).toBe('0');
    expect(componente.indice()).toBe(0);
  });

  it('muestra el mensaje del servidor cuando la consulta falla', async () => {
    httpMock
      .expectOne((r) => r.url === API)
      .flush({ message: 'Estado no valido: PENDIENTE' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(componente.error()).toBe('Estado no valido: PENDIENTE');
    expect(componente.citas()).toEqual([]);
  });

  it('RF-20: tras cancelar recarga la agenda', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([cita('cita-1', '09:00:00')]));
    await fixture.whenStable();

    componente.cancelar(cita('cita-1', '09:00:00'));
    await fixture.whenStable();

    // La fila cambio de estado: la lista que hay delante ya no vale.
    httpMock
      .expectOne((r) => r.url === API)
      .flush(pagina([cita('cita-1', '09:00:00', 'CANCELADA')]));
    await fixture.whenStable();

    expect(componente.citas()[0].estado).toBe('CANCELADA');
    expect(abiertos).toHaveLength(1);
  });

  it('si se cierra el dialogo sin cancelar no se recarga', async () => {
    montar(false);
    httpMock.expectOne((r) => r.url === API).flush(pagina([cita('cita-1', '09:00:00')]));
    await fixture.whenStable();

    componente.cancelar(cita('cita-1', '09:00:00'));
    await fixture.whenStable();

    httpMock.verify();
  });

  it('solo se puede cancelar lo que sigue CONFIRMADO', async () => {
    // RN-09 no admite retornos: el boton de una cancelada esta deshabilitado.
    httpMock
      .expectOne((r) => r.url === API)
      .flush(pagina([cita('cita-1', '09:00:00', 'CANCELADA')]));
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    const boton = raiz.querySelector<HTMLButtonElement>('button[aria-label^="Cancelar la cita"]');
    expect(boton?.disabled).toBe(true);
  });

  it('traduce NO_ASISTIO a algo legible', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
    await fixture.whenStable();

    expect(componente.etiquetaEstado('NO_ASISTIO')).toBe('No asistió');
    expect(componente.etiquetaEstado('CONFIRMADA')).toBe('Confirmada');
  });

  // ------------------------------------------------------------------
  // HU-16 · registrar el resultado desde la agenda
  // ------------------------------------------------------------------

  it('HU-16: una cita confirmada que ya termino esta pendiente de cierre', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
    await fixture.whenStable();

    const vencida = { ...cita('c-1', '09:00:00'), fecha: fechaLocal(-2) };
    expect(componente.pendienteDeCierre(vencida)).toBe(true);
  });

  it('HU-16: una cita confirmada que aun no ha llegado, no', async () => {
    // El servidor responde 409 a esa: ofrecer el boton seria mandar a pulsar
    // algo que no puede funcionar.
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
    await fixture.whenStable();

    const futura = { ...cita('c-1', '09:00:00'), fecha: fechaLocal(2) };
    expect(componente.pendienteDeCierre(futura)).toBe(false);
  });

  it('HU-16: una cita que ya tiene desenlace tampoco', async () => {
    httpMock.expectOne((r) => r.url === API).flush(pagina([]));
    await fixture.whenStable();

    const cancelada = { ...cita('c-1', '09:00:00', 'CANCELADA'), fecha: fechaLocal(-2) };
    const atendida = { ...cita('c-2', '09:00:00', 'ATENDIDA'), fecha: fechaLocal(-2) };
    expect(componente.pendienteDeCierre(cancelada)).toBe(false);
    expect(componente.pendienteDeCierre(atendida)).toBe(false);
  });

  it('HU-16: solo pinta el boton de registrar en las filas pendientes de cierre', async () => {
    const vencida = { ...cita('c-1', '09:00:00'), fecha: fechaLocal(-2) };
    const futura = { ...cita('c-2', '10:00:00'), fecha: fechaLocal(2) };
    httpMock.expectOne((r) => r.url === API).flush(pagina([vencida, futura]));
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    const botones = raiz.querySelectorAll('button[aria-label^="Registrar el resultado"]');
    expect(botones).toHaveLength(1);
    expect(botones[0].getAttribute('aria-label')).toContain('CIT-000001');
  });
});
