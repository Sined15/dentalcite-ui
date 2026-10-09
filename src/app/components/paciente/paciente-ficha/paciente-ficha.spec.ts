import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CitaResumen, EstadoCita, PacienteDetalle, Plan } from '../../../models';
import { PacienteFicha } from './paciente-ficha';

registerLocaleData(localeEsPe);

const FICHA_ID = 'fic-1';
const URL = `${environment.apiUrl}/api/v1/pacientes/${FICHA_ID}`;

function cita(id: string, fecha: string, estado: EstadoCita): CitaResumen {
  return {
    id,
    codigo: `CIT-${id}`,
    fecha,
    hora: '09:00:00',
    duracionMinutos: 30,
    zonaHoraria: 'America/Lima',
    estado,
    motivoCancelacion: null,
    cancelablePorPaciente: true,
    paciente: { fichaId: FICHA_ID, nombre: 'Rosa Huaman', numeroHistoria: 'HC-00001' },
    odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
    tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
    consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
  };
}

const DETALLE: PacienteDetalle = {
  id: FICHA_ID,
  numeroHistoria: 'HC-00001',
  tipoDocumento: 'DNI',
  documento: '71234567',
  nombres: 'Rosa',
  apellidos: 'Huaman',
  telefono: '987654321',
  tieneCuenta: true,
  alergias: 'Penicilina',
  citas: [cita('c2', '2099-01-15', 'CONFIRMADA'), cita('c1', '2020-01-15', 'ATENDIDA')],
};

function tokenCon(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

interface Interno {
  futuras: () => CitaResumen[];
  pasadas: () => CitaResumen[];
  puedeEditar: () => boolean;
  formulario: { patchValue: (v: Record<string, unknown>) => void };
  guardar: () => void;
  error: () => string | null;
  puedePlanificar: () => boolean;
  planes: () => Plan[];
  suspenderPlan: (p: Plan) => void;
}

const URL_PLANES = `${environment.apiUrl}/api/v1/planes`;

const PLAN: Plan = {
  id: 'plan-1',
  paciente: { id: FICHA_ID, nombre: 'Ramos, Julio' },
  tratamiento: { id: 'tra-1', nombre: 'Ortodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  sesionesPrevistas: 6,
  activo: true,
  motivoSuspension: null,
  creadoEn: '2026-09-01T09:00:00Z',
  avance: { completadas: 0, pendientes: 6 },
  sesiones: [1, 2, 3, 4, 5, 6].map((numero) => ({
    id: `ses-${numero}`,
    numero,
    estado: 'PENDIENTE' as const,
    cita: null,
    recomendaciones: [],
    proximoControl: null,
    observacion: null,
  })),
};

const URL_PERFIL = `${environment.apiUrl}/api/v1/usuarios/me`;
const URL_ODONTOLOGOS = `${environment.apiUrl}/api/v1/odontologos`;

const FICHA_DEL_AUTOR = 'fic-odo-1';

function paginaCon(content: unknown[]): Record<string, unknown> {
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

function resolverMiRegistro(httpMock: HttpTestingController, fichaDeLaCuenta: string): void {
  httpMock.expectOne(URL_PERFIL).flush({ id: 'usu-1', rol: 'ODONTOLOGO', fichaId: fichaDeLaCuenta });
  httpMock
    .expectOne((r) => r.url === URL_ODONTOLOGOS)
    .flush(paginaCon([{ id: 'odo-1', fichaId: FICHA_DEL_AUTOR, activo: true }]));
}

const CON_UNA_ATENDIDA: Plan = {
  ...PLAN,
  sesiones: PLAN.sesiones.map((s) =>
    s.numero === 1
      ? {
          ...s,
          estado: 'ATENDIDA' as const,
          cita: { id: 'c1', codigo: 'CIT-000123', inicio: '2026-09-12T14:00:00Z' },
        }
      : s,
  ),
};

describe('PacienteFicha', () => {
  let fixture: ComponentFixture<PacienteFicha>;
  let httpMock: HttpTestingController;
  let componente: Interno;

  function montar(rol: string): void {
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

    TestBed.configureTestingModule({
      imports: [PacienteFicha],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => FICHA_ID } } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PacienteFicha);
    componente = fixture.componentInstance as unknown as Interno;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('reparte las citas en futuras y pasadas', () => {
    montar('RECEPCIONISTA');
    httpMock.expectOne(URL).flush(DETALLE);

    expect(componente.futuras().map((c) => c.id)).toEqual(['c2']);
    expect(componente.pasadas().map((c) => c.id)).toEqual(['c1']);
  });

  it('como recepcion ofrece el formulario y guarda con un PUT', () => {
    montar('RECEPCIONISTA');
    httpMock.expectOne(URL).flush(DETALLE);

    expect(componente.puedeEditar()).toBe(true);

    componente.formulario.patchValue({ telefono: '999111222', alergias: 'Penicilina y latex' });
    componente.guardar();

    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('PUT');
    expect((req.request.body as Record<string, unknown>)['alergias']).toBe('Penicilina y latex');
    req.flush({ ...DETALLE, telefono: '999111222', alergias: 'Penicilina y latex' });
  });

  it('como odontologo no ofrece el formulario de edicion', () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);

    expect(componente.puedeEditar()).toBe(false);
  });

  it('muestra el mensaje del 403 cuando la ficha no le corresponde', () => {
    montar('ODONTOLOGO');
    httpMock
      .expectOne(URL)
      .flush(
        { message: 'No ha atendido a este paciente, así que no puede ver su ficha (RNF-06).' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(componente.error()).toContain('No ha atendido a este paciente');
  });


  it('HU-17: como odontologo pide los planes del paciente', () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);

    const req = httpMock.expectOne((r) => r.url === URL_PLANES);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pacienteId')).toBe(FICHA_ID);
    req.flush([PLAN]);

    expect(componente.puedePlanificar()).toBe(true);
    expect(componente.planes().map((p) => p.id)).toEqual(['plan-1']);
  });

  it('HU-17: como recepcion no los pide siquiera', () => {
    montar('RECEPCIONISTA');
    httpMock.expectOne(URL).flush(DETALLE);

    expect(componente.puedePlanificar()).toBe(false);
    httpMock.verify();
  });

  it('HU-17: pinta el plan con sus sesiones previstas y ofrece suspenderlo', async () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);
    httpMock.expectOne((r) => r.url === URL_PLANES).flush([PLAN]);
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Ortodoncia');
    expect(raiz.textContent).toContain('6 sesiones previstas');
    expect(raiz.querySelector('button[aria-label^="Suspender el plan"]')).not.toBeNull();
  });

  it('de cada plan da el avance y enlaza con su linea de tiempo', async () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);
    httpMock
      .expectOne((r) => r.url === URL_PLANES)
      .flush([{ ...PLAN, avance: { completadas: 2, pendientes: 4 } }]);
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('2 de 6 completadas');
    expect(
      raiz
        .querySelector('a[aria-label="Ver el avance del plan de Ortodoncia"]')
        ?.getAttribute('href'),
    ).toBe(`/planes/${PLAN.id}`);
  });

  it('HU-17: un plan suspendido no ofrece volver a suspenderse', async () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);
    httpMock
      .expectOne((r) => r.url === URL_PLANES)
      .flush([{ ...PLAN, activo: false, motivoSuspension: 'El paciente se muda' }]);
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('button[aria-label^="Suspender el plan"]')).toBeNull();
    expect(raiz.textContent).toContain('El paciente se muda');
  });

  it('HU-17: sin planes lo dice en vez de dejar la seccion en blanco', async () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);
    httpMock.expectOne((r) => r.url === URL_PLANES).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No tiene ningún plan de tratamiento',
    );
  });

  it('pinta cada sesion con su estado escrito y, si esta ocupada, con su cita', async () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);
    httpMock.expectOne((r) => r.url === URL_PLANES).flush([CON_UNA_ATENDIDA]);
    await fixture.whenStable();
    fixture.detectChanges();

    const filas = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.sesiones li'),
    ).map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim());

    expect(filas).toHaveLength(6);
    expect(filas[0]).toContain('Sesión 1');
    expect(filas[0]).toContain('Atendida');
    expect(filas[0]).toContain('CIT-000123');
    expect(filas[0]).toContain('2026');
    expect(filas[1]).toContain('Sesión 2');
    expect(filas[1]).toContain('Pendiente');
    expect(filas[1]).not.toContain('CIT-');
  });


  it('ofrece cerrar la sesion atendida al odontologo que firmo el plan', async () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);
    httpMock.expectOne((r) => r.url === URL_PLANES).flush([CON_UNA_ATENDIDA]);
    resolverMiRegistro(httpMock, FICHA_DEL_AUTOR);
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('button[aria-label^="Cerrar la sesión 1"]')).not.toBeNull();
    expect(raiz.querySelector('button[aria-label^="Cerrar la sesión 2"]')).toBeNull();
  });

  it('a un odontologo que no firmo el plan no se le ofrece cerrar', async () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);
    httpMock.expectOne((r) => r.url === URL_PLANES).flush([CON_UNA_ATENDIDA]);
    resolverMiRegistro(httpMock, 'fic-de-otra-odontologa');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-label^="Cerrar la sesión"]'),
    ).toBeNull();
  });

  it('una sesion cerrada muestra lo indicado y cuando volver', async () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);
    const conUnaCerrada: Plan = {
      ...PLAN,
      sesiones: PLAN.sesiones.map((s) =>
        s.numero === 1
          ? {
              ...s,
              estado: 'CERRADA' as const,
              cita: { id: 'c1', codigo: 'CIT-000123', inicio: '2026-09-12T14:00:00Z' },
              recomendaciones: [{ id: 'rec-1', descripcion: 'Mantener dieta blanda' }],
              proximoControl: '2026-10-15',
              observacion: 'Volver antes si hay dolor',
            }
          : s,
      ),
    };
    httpMock.expectOne((r) => r.url === URL_PLANES).flush([conUnaCerrada]);
    resolverMiRegistro(httpMock, FICHA_DEL_AUTOR);
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Mantener dieta blanda');
    expect(raiz.textContent).toContain('Próximo control');
    expect(raiz.textContent).toContain('Volver antes si hay dolor');
    expect(raiz.querySelector('button[aria-label^="Cerrar la sesión 1"]')).toBeNull();
  });
});
