import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { Plan } from '../../models';
import { SeguimientoPlanes } from './seguimiento-planes';

const API = `${environment.apiUrl}/api/v1/planes/seguimiento`;
const API_PERFIL = `${environment.apiUrl}/api/v1/usuarios/me`;
const API_ODONTOLOGOS = `${environment.apiUrl}/api/v1/odontologos`;
const MI_FICHA = 'fic-luis';
const MI_ID = 'odo-luis';

function plan(id: string, cambios: Partial<Plan> = {}): Plan {
  return {
    id,
    paciente: { id: `fic-${id}`, nombre: 'Julio Ramos' },
    tratamiento: { id: 'tra-1', nombre: 'Ortodoncia' },
    odontologo: { id: MI_ID, nombre: 'Luis Pérez' },
    sesionesPrevistas: 6,
    activo: true,
    motivoSuspension: null,
    creadoEn: '2026-08-01T09:00:00Z',
    avance: { completadas: 2, pendientes: 4 },
    sesiones: [],
    ...cambios,
  };
}

function pagina(planes: Plan[]) {
  return {
    content: planes,
    totalElements: planes.length,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
  };
}

describe('SeguimientoPlanes', () => {
  let fixture: ComponentFixture<SeguimientoPlanes>;
  let httpMock: HttpTestingController;

  function levantar(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SeguimientoPlanes],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SeguimientoPlanes);
  }

  /** «Tuyo» se resuelve igual que en el servidor: de la cuenta a la ficha y de ahí al registro. */
  function resolverQuienSoy(): void {
    httpMock.expectOne(API_PERFIL).flush({ id: 'usu-1', rol: 'ODONTOLOGO', fichaId: MI_FICHA });
    httpMock
      .expectOne((r) => r.url === API_ODONTOLOGOS)
      .flush({ ...pagina([]), content: [{ id: MI_ID, fichaId: MI_FICHA, activo: true }] });
  }

  async function montar(planes: Plan[]): Promise<HTMLElement> {
    levantar();
    resolverQuienSoy();
    httpMock.expectOne((r) => r.url === API).flush(pagina(planes));
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('pide por defecto solo los planes en curso', () => {
    levantar();
    resolverQuienSoy();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('soloActivos')).toBe('true');
    req.flush(pagina([]));
  });

  it('pinta una tarjeta por plan con su avance', async () => {
    const raiz = await montar([plan('p-1'), plan('p-2', { avance: { completadas: 5, pendientes: 1 } })]);

    expect(raiz.querySelectorAll('mat-card')).toHaveLength(2);
    expect(raiz.textContent).toContain('2 de 6');
    expect(raiz.textContent).toContain('5 de 6');
  });

  it('marca como tuyos los que firmo y dice quien firmo los demas', async () => {
    const raiz = await montar([
      plan('p-1'),
      plan('p-2', { odontologo: { id: 'odo-ana', nombre: 'Ana Quispe' } }),
    ]);
    const tarjetas = raiz.querySelectorAll('mat-card');

    expect(tarjetas[0].textContent).toContain('Tuyo');
    expect(tarjetas[1].textContent).toContain('Firmado por Ana Quispe');
  });

  it('señala con texto las sesiones por cerrar', async () => {
    const raiz = await montar([
      plan('p-1', {
        sesiones: [
          {
            id: 's-1',
            numero: 1,
            estado: 'ATENDIDA',
            cita: { id: 'c-1', codigo: 'CIT-000001', inicio: '2026-09-01T15:00:00Z' },
            recomendaciones: [],
            proximoControl: null,
            observacion: null,
          },
        ],
      }),
    ]);

    expect(raiz.textContent).toContain('1 por cerrar');
  });

  it('enlaza cada plan con su linea de tiempo y al paciente con su ficha', async () => {
    const raiz = await montar([plan('p-1')]);

    expect(
      raiz
        .querySelector('a[aria-label="Ver el avance de Ortodoncia de Julio Ramos"]')
        ?.getAttribute('href'),
    ).toBe('/planes/p-1');
    expect(raiz.querySelector('a[href="/pacientes/fic-p-1"]')?.textContent).toContain('Julio Ramos');
  });

  it('sin planes lo dice en vez de dejar la pantalla en blanco', async () => {
    const raiz = await montar([]);

    expect(raiz.textContent).toContain('Ninguno de tus pacientes tiene un plan de tratamiento.');
  });

  it('al incluir los suspendidos vuelve a pedir desde la primera pagina', async () => {
    await montar([plan('p-1')]);

    (fixture.componentInstance as unknown as { alternarSuspendidos: (v: boolean) => void })
      .alternarSuspendidos(true);

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('soloActivos')).toBe('false');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(pagina([]));
  });
});
