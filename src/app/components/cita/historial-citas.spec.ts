import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { CitaResumen } from '../../models';
import { cita, pagina } from './citas.testing';
import { HistorialCitas } from './historial-citas';

const API = `${environment.apiUrl}/api/v1/citas/mias`;

registerLocaleData(localeEsPe);

interface Interno {
  pasadas: () => CitaResumen[];
}

describe('HistorialCitas', () => {
  let fixture: ComponentFixture<HistorialCitas>;
  let httpMock: HttpTestingController;
  let componente: Interno;

  function levantar(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HistorialCitas],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HistorialCitas);
    componente = fixture.componentInstance as unknown as Interno;
  }

  async function montar(citas: CitaResumen[]): Promise<void> {
    levantar();
    httpMock.expectOne((r) => r.url === API).flush(pagina(citas));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('no filtra por estado: el historial incluye canceladas y no asistidas', async () => {
    levantar();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.has('estado')).toBe(false);
    expect(req.request.params.has('pacienteId')).toBe(false);
    req.flush(pagina([]));
  });

  it('pide todas las paginas, no solo la primera', async () => {
    levantar();
    httpMock
      .expectOne((r) => r.url === API)
      .flush(pagina([cita('c-1', -3, 'ATENDIDA')], { number: 0, last: false }));
    httpMock
      .expectOne((r) => r.url === API)
      .flush(pagina([cita('c-2', -40, 'ATENDIDA')], { number: 1, last: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(componente.pasadas().map((c) => c.id)).toEqual(['c-1', 'c-2']);
  });

  it('muestra solo las pasadas, de la mas reciente a la mas antigua', async () => {
    await montar([
      cita('c-1', -2, 'ATENDIDA'),
      cita('c-2', -50, 'NO_ASISTIO'),
      cita('c-3', 10, 'CONFIRMADA'),
    ]);

    expect(componente.pasadas().map((c) => c.id)).toEqual(['c-1', 'c-2']);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('CIT-000003');
  });

  it('no ofrece cancelar ninguna cita', async () => {
    await montar([cita('c-1', -1, 'ATENDIDA', true)]);

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('button[aria-label^="Cancelar"]')).toBeNull();
  });

  it('de una cancelada muestra el motivo', async () => {
    await montar([cita('c-1', -4, 'CANCELADA')]);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ya no podia asistir');
  });

  it('sin citas pasadas lo dice en vez de dejar la pantalla en blanco', async () => {
    await montar([cita('c-1', 5, 'CONFIRMADA')]);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Todavía no tienes citas anteriores',
    );
  });
});
