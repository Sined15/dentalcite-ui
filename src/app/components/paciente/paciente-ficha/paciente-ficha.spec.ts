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

/** Una en el pasado lejano y otra en el futuro lejano: nada al filo de hoy. */
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

/** Un plan activo de seis sesiones, todas pendientes (HU-17). */
const PLAN: Plan = {
  id: 'plan-1',
  paciente: { id: FICHA_ID, nombre: 'Ramos, Julio' },
  tratamiento: { id: 'tra-1', nombre: 'Ortodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Luis Pérez' },
  sesionesPrevistas: 6,
  activo: true,
  motivoSuspension: null,
  creadoEn: '2026-09-01T09:00:00Z',
  sesiones: [1, 2, 3, 4, 5, 6].map((numero) => ({
    id: `ses-${numero}`,
    numero,
    estado: 'PENDIENTE' as const,
  })),
};

/**
 * HU-13 · RF-08 y la sección de planes que HU-17 añade. Lo que se comprueba: que
 * la ficha se pinta con sus alergias y sus citas repartidas en pasadas y
 * futuras, que el formulario de corrección solo aparece para quien RF-08
 * autoriza a editar, y que los planes solo se piden y se pintan para quien puede
 * planificar.
 */
describe('PacienteFicha', () => {
  let fixture: ComponentFixture<PacienteFicha>;
  let httpMock: HttpTestingController;
  let componente: Interno;

  function montar(rol: string): void {
    // AuthService lee el token al construirse: hay que dejarlo antes del TestBed.
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

  /** RF-08 deja al odontólogo en lectura: no se le ofrece un botón que dará 403. */
  it('como odontologo no ofrece el formulario de edicion', () => {
    montar('ODONTOLOGO');
    httpMock.expectOne(URL).flush(DETALLE);

    expect(componente.puedeEditar()).toBe(false);
  });

  /** RNF-06: el 403 del servidor es la defensa, y aquí se explica. */
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

  // ------------------------------------------------------------------
  // HU-17 · los planes de tratamiento
  // ------------------------------------------------------------------

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
    // El servidor le responderia 403: pintarle una seccion vacia prometeria algo
    // que no puede abrir.
    montar('RECEPCIONISTA');
    httpMock.expectOne(URL).flush(DETALLE);

    expect(componente.puedePlanificar()).toBe(false);
    // Si se hubiera pedido, esto fallaria: no queda ninguna peticion pendiente.
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
    // RN-12: el registro se conserva, con su motivo a la vista.
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
});
