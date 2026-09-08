import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/api.types';
import { Especialidad } from '../../models';
import { EspecialidadList } from './especialidad-list';

/**
 * Regresión del filtro.
 *
 * El listado filtraba solo sobre la página cargada, así que buscar un registro
 * que estuviera a partir de la fila 21 no devolvía nada. Estas pruebas fijan que
 * se recorre el conjunto completo y que la paginación es de cliente.
 */
const API = `${environment.apiUrl}/api/v1/especialidades`;

function especialidad(nombre: string, i: number): Especialidad {
  return { id: `esp-${i}`, nombre, descripcion: null, activo: true };
}

/** 25 especialidades: mas de una pagina del servidor, que sirve 20 por defecto. */
const TODAS: Especialidad[] = [
  ...Array.from({ length: 24 }, (_, i) => especialidad(`Especialidad ${i + 1}`, i + 1)),
  especialidad('Ortodoncia', 25),
];

function pagina(desde: number, tamano: number): PageResponse<Especialidad> {
  const content = TODAS.slice(desde, desde + tamano);
  const totalPages = Math.ceil(TODAS.length / tamano);
  const number = Math.floor(desde / tamano);
  return {
    content,
    totalElements: TODAS.length,
    totalPages,
    number,
    size: tamano,
    first: number === 0,
    last: number >= totalPages - 1,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

describe('EspecialidadList', () => {
  let fixture: ComponentFixture<EspecialidadList>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [EspecialidadList],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EspecialidadList);

    // El componente carga en el constructor: se responden las paginas que pida.
    for (let desde = 0; desde < TODAS.length; desde += 100) {
      const req = httpMock.expectOne((r) => r.url === API);
      req.flush(pagina(desde, 100));
    }
    await fixture.whenStable();
  });

  it('carga el conjunto completo, no solo la primera pagina', () => {
    const componente = fixture.componentInstance as unknown as {
      filas: () => Especialidad[];
    };
    expect(componente.filas()).toHaveLength(25);
  });

  it('encuentra un registro que quedaria fuera de la primera pagina del servidor', () => {
    const componente = fixture.componentInstance as unknown as {
      filtro: { set: (v: string) => void };
      filas: () => Especialidad[];
    };
    // «Ortodoncia» es la nº 25: antes del arreglo, filtrar no la encontraba.
    componente.filtro.set('ortodoncia');
    expect(componente.filas()).toHaveLength(1);
    expect(componente.filas()[0].nombre).toBe('Ortodoncia');
  });

  it('pagina en cliente sin volver a pedir al servidor', () => {
    const componente = fixture.componentInstance as unknown as {
      pagina: () => Especialidad[];
      indice: { set: (v: number) => void };
      tamano: { set: (v: number) => void };
    };
    componente.tamano.set(10);
    componente.indice.set(0);
    expect(componente.pagina()).toHaveLength(10);

    componente.indice.set(2);
    expect(componente.pagina()).toHaveLength(5);

    // Ninguna peticion nueva: el conjunto ya estaba en memoria.
    httpMock.verify();
  });

  it('el filtro vacio devuelve todo', () => {
    const componente = fixture.componentInstance as unknown as {
      filtro: { set: (v: string) => void };
      filas: () => Especialidad[];
    };
    componente.filtro.set('   ');
    expect(componente.filas()).toHaveLength(25);
  });
});
