import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { CitaResumen, Plan } from '../../models';
import { cita, pagina } from './citas.testing';
import { MisTratamientos } from './mis-tratamientos';

const API = `${environment.apiUrl}/api/v1/citas/mias`;
const API_PERFIL = `${environment.apiUrl}/api/v1/usuarios/me`;
const API_PLANES = `${environment.apiUrl}/api/v1/planes`;
const FICHA = 'fic-1';

const PLAN: Plan = {
  id: 'plan-1',
  paciente: { id: FICHA, nombre: 'Ramos, Julio' },
  tratamiento: { id: 'tra-1', nombre: 'Ortodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  sesionesPrevistas: 3,
  activo: true,
  motivoSuspension: null,
  creadoEn: '2026-09-01T09:00:00Z',
  avance: { completadas: 1, pendientes: 2 },
  sesiones: [
    {
      id: 'ses-1',
      numero: 1,
      estado: 'CERRADA',
      cita: { id: 'c-1', codigo: 'CIT-000123', inicio: '2026-09-12T14:00:00Z' },
      recomendaciones: [{ id: 'rec-1', descripcion: 'Mantener dieta blanda' }],
      proximoControl: '2026-10-15',
      observacion: 'Volver antes si hay dolor',
    },
    {
      id: 'ses-2',
      numero: 2,
      estado: 'PENDIENTE',
      cita: null,
      recomendaciones: [],
      proximoControl: null,
      observacion: null,
    },
  ],
};
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

  function resolverPlanes(planes: Plan[]): void {
    httpMock.expectOne(API_PERFIL).flush({ id: 'usu-1', rol: 'PACIENTE', fichaId: FICHA });
    const req = httpMock.expectOne((r) => r.url === API_PLANES);
    expect(req.request.params.get('pacienteId')).toBe(FICHA);
    req.flush(planes);
  }

  async function montar(citas: CitaResumen[], planes: Plan[] = []): Promise<void> {
    levantar();
    httpMock.expectOne((r) => r.url === API).flush(pagina(citas));
    resolverPlanes(planes);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('pide al servidor solo las citas ATENDIDA', async () => {
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


  it('muestra el avance que cuenta el servidor y el ultimo proximo control', async () => {
    await montar([], [PLAN]);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ortodoncia');
    expect(texto).toContain('1 de 3 sesiones completadas');
    expect(texto).toContain('Próximo control: 15 de octubre de 2026');
  });

  it('lee la cifra del servidor y no la cuenta sobre las sesiones', async () => {
    await montar([], [{ ...PLAN, avance: { completadas: 2, pendientes: 1 } }]);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      '2 de 3 sesiones completadas',
    );
  });

  it('enlaza cada plan con su linea de tiempo', async () => {
    await montar([], [PLAN]);

    const enlace = (fixture.nativeElement as HTMLElement).querySelector(
      'a[aria-label="Ver el avance de Ortodoncia"]',
    );
    expect(enlace?.getAttribute('href')).toBe('/planes/plan-1');
  });

  it('anuncia la barra de avance con su cifra', async () => {
    await montar([], [PLAN]);

    const barra = (fixture.nativeElement as HTMLElement).querySelector('mat-progress-bar');
    expect(barra?.getAttribute('aria-label')).toBe('Avance de Ortodoncia: 1 de 3 sesiones');
  });

  it('sin planes no pinta la seccion', async () => {
    await montar([], []);

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Mis planes de tratamiento',
    );
  });

  it('si los planes fallan, los tratamientos recibidos siguen legibles', async () => {
    levantar();
    httpMock
      .expectOne((r) => r.url === API)
      .flush(pagina([cita({ id: 'c-1', dias: -3, estado: 'ATENDIDA', tratamiento: ENDODONCIA })]));
    httpMock.expectOne(API_PERFIL).flush({ id: 'usu-1', rol: 'PACIENTE', fichaId: FICHA });
    httpMock
      .expectOne((r) => r.url === API_PLANES)
      .flush({ message: 'Vaya' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Endodoncia unirradicular',
    );
  });
});
