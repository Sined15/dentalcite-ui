import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { Plan, PlanSesion } from '../../models';
import { PlanAvance } from './plan-avance';

const PLAN_ID = 'plan-1';
const API = `${environment.apiUrl}/api/v1/planes/${PLAN_ID}`;

function sesion(numero: number, cambios: Partial<PlanSesion> = {}): PlanSesion {
  return {
    id: `ses-${numero}`,
    numero,
    estado: 'PENDIENTE',
    cita: null,
    recomendaciones: [],
    proximoControl: null,
    observacion: null,
    ...cambios,
  };
}

const PLAN: Plan = {
  id: PLAN_ID,
  paciente: { id: 'fic-1', nombre: 'Julio Ramos' },
  tratamiento: { id: 'tra-1', nombre: 'Ortodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  sesionesPrevistas: 6,
  activo: true,
  motivoSuspension: null,
  creadoEn: '2026-08-01T09:00:00Z',
  avance: { completadas: 2, pendientes: 4 },
  sesiones: [
    sesion(1, {
      estado: 'CERRADA',
      cita: { id: 'c-1', codigo: 'CIT-000001', inicio: '2026-08-10T15:00:00Z' },
      recomendaciones: [{ id: 'rec-1', descripcion: 'Mantener dieta blanda' }],
      proximoControl: '2026-09-10',
      observacion: 'Volver antes si hay dolor',
    }),
    sesion(2, {
      estado: 'ATENDIDA',
      cita: { id: 'c-2', codigo: 'CIT-000002', inicio: '2026-09-05T15:00:00Z' },
    }),
    sesion(3),
    sesion(4),
    sesion(5),
    sesion(6),
  ],
};

function tokenCon(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

registerLocaleData(localeEsPe);

describe('PlanAvance', () => {
  let fixture: ComponentFixture<PlanAvance>;
  let httpMock: HttpTestingController;

  function levantar(rol: string): void {
    localStorage.setItem(
      'dentalcite.token',
      tokenCon({
        iss: 'dentalcite',
        sub: 'a13d43f3-8930-4f00-baf2-70d492be76b2',
        rol,
        requiere_cambio_password: false,
        exp: Math.floor(Date.now() / 1000) + 8 * 3600,
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PlanAvance],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => PLAN_ID } } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlanAvance);
  }

  async function montar(plan: Plan = PLAN, rol = 'PACIENTE'): Promise<HTMLElement> {
    levantar(rol);
    httpMock.expectOne(API).flush(plan);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => localStorage.clear());

  it('dice cuantas sesiones van completadas y cuantas faltan', async () => {
    const raiz = await montar();

    expect(raiz.textContent).toContain('2 de 6');
    expect(raiz.textContent).toContain('sesiones completadas');
    expect(raiz.textContent).toContain('4 pendientes');
  });

  it('anuncia la barra de avance con la misma cifra', async () => {
    const raiz = await montar();

    const barra = raiz.querySelector('mat-progress-bar[mode="determinate"]');
    expect(barra?.getAttribute('aria-label')).toBe('Avance del plan: 2 de 6 sesiones');
  });

  it('pinta una entrada por sesion en la linea de tiempo', async () => {
    const raiz = await montar();

    expect(raiz.querySelectorAll('ol.linea > li')).toHaveLength(6);
  });

  it('de cada sesion atendida da la fecha y de la cerrada lo indicado', async () => {
    const raiz = await montar();
    const primera = raiz.querySelectorAll('ol.linea > li')[0].textContent ?? '';

    expect(primera).toContain('Atendida el 10 de agosto de 2026');
    expect(primera).toContain('Mantener dieta blanda');
    expect(primera).toContain('Volver antes si hay dolor');
    expect(primera).toContain('Próximo control: 10 de setiembre de 2026');
  });

  it('señala con texto las atendidas pendientes de cierre', async () => {
    const raiz = await montar();
    const segunda = raiz.querySelectorAll('ol.linea > li')[1].textContent ?? '';

    expect(segunda).toContain('pendiente de cierre');
    expect(raiz.textContent).toContain('Una sesión atendida está pendiente de cierre.');
  });

  it('no pinta recomendaciones en las que aun no se han cerrado', async () => {
    const raiz = await montar();
    const tercera = raiz.querySelectorAll('ol.linea > li')[2].textContent ?? '';

    expect(tercera).toContain('Pendiente');
    expect(tercera).not.toContain('Recomendaciones');
    expect(tercera).not.toContain('Atendida el');
  });

  it('sin sesiones por cerrar no avisa de ninguna', async () => {
    const raiz = await montar({
      ...PLAN,
      sesiones: PLAN.sesiones.map((s) => (s.estado === 'ATENDIDA' ? { ...s, estado: 'CERRADA' } : s)),
    });

    expect(raiz.textContent).not.toContain('pendiente de cierre.');
  });

  it('con un 403 lo explica sin afirmar de quien es el plan', async () => {
    levantar('PACIENTE');
    httpMock
      .expectOne(API)
      .flush({ message: 'Solo puede consultar su propia ficha' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    fixture.detectChanges();

    const alerta = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('No puedes consultar este plan de tratamiento.');
  });

  it('el paciente vuelve a sus tratamientos y no ve su propio nombre repetido', async () => {
    const raiz = await montar();

    expect(raiz.querySelector('a.volver')?.getAttribute('href')).toBe('/mis-tratamientos');
    expect(raiz.querySelector('header')?.textContent).not.toContain('Julio Ramos');
  });

  it('el odontologo vuelve a su seguimiento y ve de quien es el plan', async () => {
    const raiz = await montar(PLAN, 'ODONTOLOGO');

    expect(raiz.querySelector('a.volver')?.getAttribute('href')).toBe('/seguimiento');
    expect(raiz.querySelector('header')?.textContent).toContain('Julio Ramos');
  });

  it('administracion vuelve a la ficha del paciente', async () => {
    const raiz = await montar(PLAN, 'ADMINISTRADOR');

    expect(raiz.querySelector('a.volver')?.getAttribute('href')).toBe('/pacientes/fic-1');
  });
});
