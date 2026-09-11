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
import { MisTratamientos } from './mis-tratamientos';

const API = `${environment.apiUrl}/api/v1/citas/mias`;
const ENDODONCIA = { id: 'tra-1', nombre: 'Endodoncia unirradicular' };
const PROFILAXIS = { id: 'tra-2', nombre: 'Profilaxis dental' };

registerLocaleData(localeEsPe);

describe('MisTratamientos', () => {
  let fixture: ComponentFixture<MisTratamientos>;
  let httpMock: HttpTestingController;

  function levantar(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MisTratamientos],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisTratamientos);
  }

  async function montar(citas: CitaResumen[]): Promise<void> {
    levantar();
    httpMock.expectOne((r) => r.url === API).flush(pagina(citas));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('pide al servidor solo las citas ATENDIDA', async () => {
    // Recibido es lo que ya ocurrio: una cita futura o cancelada no es un
    // tratamiento que le hayan hecho a nadie.
    levantar();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('estado')).toBe('ATENDIDA');
    req.flush(pagina([]));
  });

  it('recorre todas las paginas', async () => {
    levantar();
    httpMock
      .expectOne((r) => r.url === API)
      .flush(pagina([cita({ id: 'c-1', dias: -2, estado: 'ATENDIDA', tratamiento: ENDODONCIA })], {
        number: 0,
        last: false,
      }));
    httpMock
      .expectOne((r) => r.url === API)
      .flush(pagina([cita({ id: 'c-2', dias: -9, estado: 'ATENDIDA', tratamiento: PROFILAXIS })], {
        number: 1,
        last: true,
      }));
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Endodoncia unirradicular');
    expect(texto).toContain('Profilaxis dental');
  });

  it('pinta una tarjeta por tratamiento con sus sesiones y la ultima', async () => {
    await montar([
      cita({ id: 'c-1', dias: -3, estado: 'ATENDIDA', tratamiento: ENDODONCIA }),
      cita({ id: 'c-2', dias: -20, estado: 'ATENDIDA', tratamiento: ENDODONCIA }),
    ]);

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('mat-card')).toHaveLength(1);
    expect(raiz.textContent).toContain('2 sesiones');
    expect(raiz.textContent).toContain('Con Luis Pérez');
  });

  it('con una sola sesion lo dice en singular', async () => {
    await montar([cita({ id: 'c-1', dias: -3, estado: 'ATENDIDA', tratamiento: PROFILAXIS })]);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 sesión');
  });

  it('sin tratamientos recibidos lo dice en vez de dejar la pantalla en blanco', async () => {
    await montar([]);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Todavía no has recibido ningún tratamiento',
    );
  });
});
