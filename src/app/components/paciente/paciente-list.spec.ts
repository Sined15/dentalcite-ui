import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/api.types';
import { Paciente } from '../../models';
import { PacienteList } from './paciente-list';

const PACIENTES = `${environment.apiUrl}/api/v1/pacientes`;

function paciente(i: number): Paciente {
  return {
    id: `fic-${i}`,
    numeroHistoria: `HC-0000${i}`,
    tipoDocumento: 'DNI',
    documento: `7000000${i}`,
    nombres: `Nombre ${i}`,
    apellidos: `Apellido ${i}`,
    telefono: null,
    tieneCuenta: false,
  };
}

function pagina(indice: number, tamano: number, total: number): PageResponse<Paciente> {
  const content = Array.from({ length: Math.min(tamano, total - indice * tamano) }, (_, k) =>
    paciente(indice * tamano + k),
  );
  return {
    content,
    totalElements: total,
    totalPages: Math.ceil(total / tamano),
    number: indice,
    size: tamano,
    first: indice === 0,
    last: (indice + 1) * tamano >= total,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

interface Interno {
  formulario: { controls: { q: { setValue: (v: string) => void } } };
  cambiarPagina: (evento: { pageIndex: number; pageSize: number; length: number }) => void;
  error: () => string | null;
}

/**
 * HU-13 · RF-07. Lo que se fija aquí es la decisión que RNF-02 obliga a tomar:
 * que la paginación y el filtrado ocurren en el **servidor**, y que el listado
 * no se trae entero para filtrarlo en memoria como hacen los catálogos.
 */
describe('PacienteList', () => {
  let fixture: ComponentFixture<PacienteList>;
  let httpMock: HttpTestingController;
  let componente: Interno;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [PacienteList],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PacienteList);
    componente = fixture.componentInstance as unknown as Interno;
  });

  it('carga la primera pagina al abrirse, sin termino de busqueda', () => {
    const req = httpMock.expectOne((r) => r.url === PACIENTES);
    expect(req.request.params.has('q')).toBe(false);
    expect(req.request.params.get('page')).toBe('0');
    req.flush(pagina(0, 20, 45));

    httpMock.verify();
  });

  /** Una consulta por pagina, no la descarga completa del padron. */
  it('al cambiar de pagina pide esa pagina al servidor', () => {
    httpMock.expectOne((r) => r.url === PACIENTES).flush(pagina(0, 20, 45));

    componente.cambiarPagina({ pageIndex: 2, pageSize: 20, length: 45 });

    const req = httpMock.expectOne((r) => r.url === PACIENTES);
    expect(req.request.params.get('page')).toBe('2');
    req.flush(pagina(2, 20, 45));
  });

  /**
   * Sin la espera, escribir un apellido de ocho letras lanzaría ocho búsquedas
   * y solo importa la última.
   */
  it('agrupa las pulsaciones antes de consultar, y vuelve a la primera pagina', () => {
    httpMock.expectOne((r) => r.url === PACIENTES).flush(pagina(0, 20, 45));

    componente.formulario.controls.q.setValue('Hua');
    componente.formulario.controls.q.setValue('Huaman');
    httpMock.expectNone((r) => r.url === PACIENTES);

    vi.advanceTimersByTime(300);

    const req = httpMock.expectOne((r) => r.url === PACIENTES);
    expect(req.request.params.get('q')).toBe('Huaman');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(pagina(0, 20, 1));
  });

  it('muestra el mensaje del error y deja la tabla vacia', () => {
    httpMock
      .expectOne((r) => r.url === PACIENTES)
      .flush({ message: 'No autenticado' }, { status: 401, statusText: 'Unauthorized' });

    expect(componente.error()).toContain('No autenticado');
  });
});
