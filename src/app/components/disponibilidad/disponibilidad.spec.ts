import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import {
  CalendarioPublico,
  Cita,
  DisponibilidadResponse,
  OdontologoPublico,
  Paciente,
  TratamientoPublico,
} from '../../models';
import { Disponibilidad } from './disponibilidad';
import { IdentificarseDialogo } from './identificarse-dialogo';
import { ReservarDialogo, ReservarResultado } from './reservar-dialogo';

const API = `${environment.apiUrl}/api/v1/disponibilidad`;
const API_TRATAMIENTOS = `${environment.apiUrl}/api/v1/publico/tratamientos`;
const API_ODONTOLOGOS = `${environment.apiUrl}/api/v1/publico/odontologos`;
const API_CALENDARIO = `${environment.apiUrl}/api/v1/publico/calendario`;

const TRATAMIENTOS: TratamientoPublico[] = [
  {
    id: 'tra-1',
    nombre: 'Endodoncia',
    descripcion: null,
    duracionMinutos: 30,
    imagenUrl: null,
    especialidadId: 'esp-1',
    especialidadNombre: 'ENDODONCIA',
  },
];

function odontologo(id: string, nombres: string, especialidadIds: string[]): OdontologoPublico {
  return {
    id,
    cop: `COP-${id}`,
    nombres,
    apellidos: 'Apellido',
    imagenUrl: null,
    especialidades: [],
    especialidadIds,
  };
}

const ODONTOLOGOS: OdontologoPublico[] = [
  odontologo('odo-1', 'Juan', ['esp-1']),
  odontologo('odo-2', 'Ana', ['esp-2']),
];

const CALENDARIO: CalendarioPublico = {
  diasDeAtencion: [1, 2, 3, 4, 5, 6],
  feriados: ['2026-07-28'],
  porOdontologo: [
    { odontologoId: 'odo-1', dias: [1, 3, 5] },
    { odontologoId: 'odo-2', dias: [1, 2, 3, 4, 5, 6] },
  ],
};

const RESPUESTA: DisponibilidadResponse = {
  tratamientoId: 'tra-1',
  duracionMinutos: 30,
  desde: '2026-09-14',
  hasta: '2026-09-14',
  zonaHoraria: 'America/Lima',
  odontologos: [
    {
      id: 'odo-1',
      nombres: 'Juan',
      apellidos: 'Pérez',
      dias: [{ fecha: '2026-09-14', inicios: ['09:00:00', '09:15:00', '09:30:00'] }],
    },
  ],
};

const CITA: Cita = {
  id: 'cita-1',
  codigo: 'CIT-000123',
  fecha: '2026-09-14',
  hora: '09:00:00',
  duracionMinutos: 30,
  zonaHoraria: 'America/Lima',
  estado: 'CONFIRMADA',
  tratamiento: { id: 'tra-1', nombre: 'Endodoncia' },
  odontologo: { id: 'odo-1', nombre: 'Juan Perez' },
  consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
};

const PACIENTE: Paciente = {
  id: 'fic-9',
  numeroHistoria: 'HC-00042',
  tipoDocumento: 'DNI',
  documento: '87654321',
  nombres: 'Julio',
  apellidos: 'Ramos',
  telefono: null,
  tieneCuenta: false,
};

function hoyMas(dias: number): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
}

function iso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function primerDiaQueAtiende(dias: number[]): Date {
  for (let i = 0; i < 14; i++) {
    const fecha = hoyMas(i);
    const dia = fecha.getDay() === 0 ? 7 : fecha.getDay();
    if (dias.includes(dia)) {
      return fecha;
    }
  }
  throw new Error('Ningun dia de la ventana cae en ' + dias.join(', '));
}

// Tres días por delante, saltando el domingo: la clínica cierra y «Consultar» no pide nada.
const DIA = hoyMas(3).getDay() === 0 ? hoyMas(4) : hoyMas(3);

interface Interno {
  formulario: {
    patchValue: (valores: Record<string, string | Date>) => void;
    invalid: boolean;
    hasError: (codigo: string) => boolean;
    controls: {
      odontologoId: { value: string };
      tratamientoId: { value: string };
      dia: { hasError: (codigo: string) => boolean };
    };
  };
  odontologosAptos: () => OdontologoPublico[];
  tratamientos: () => TratamientoPublico[];
  visitante: () => boolean;
  dias: () => {
    fecha: string;
    bloques: { inicio: string; inicios: string[]; odontologos: unknown[] }[];
  }[];
  abrirReserva: (dia: unknown, bloque: unknown) => void;
  ultimaReserva: () => Cita | null;
  puedeReservar: () => boolean;
  reservaParaOtro: () => boolean;
  pacienteElegido: () => Paciente | null;
  elegirPaciente: (p: Paciente) => void;
  mostrarPaciente: (p: Paciente | string | null) => string;
  consultar: () => void;
  error: () => string | null;
  soloDiasConAtencion: () => (fecha: Date | null) => boolean;
}

registerLocaleData(localeEsPe);

function sesionCon(rol: string): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = {
    iss: 'dentalcite',
    sub: 'a13d43f3-8930-4f00-baf2-70d492be76b2',
    rol,
    requiere_cambio_password: false,
    exp: Math.floor(Date.now() / 1000) + 8 * 3600,
  };
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

describe('Disponibilidad', () => {
  let fixture: ComponentFixture<Disponibilidad>;
  let httpMock: HttpTestingController;
  let componente: Interno;
  const abiertos: unknown[] = [];
  const datosAbiertos: unknown[] = [];

  afterEach(() => localStorage.clear());

  async function montarComo(
    rol: string | null,
    cierraCon: ReservarResultado | null = { cita: CITA },
    query: Record<string, string> = {},
  ): Promise<void> {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (rol) {
      localStorage.setItem('dentalcite.token', sesionCon(rol));
    }
    abiertos.length = 0;
    datosAbiertos.length = 0;
    const dialogoDoble = {
      open: (componente: unknown, config?: { data?: unknown }) => {
        abiertos.push(componente);
        datosAbiertos.push(config?.data);
        return { afterClosed: () => of(abiertos.length === 1 ? cierraCon : null) };
      },
    };
    TestBed.configureTestingModule({
      imports: [Disponibilidad],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
        { provide: MatDialog, useValue: dialogoDoble },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Disponibilidad);
    componente = fixture.componentInstance as unknown as Interno;

    httpMock.expectOne(API_TRATAMIENTOS).flush(TRATAMIENTOS);
    httpMock.expectOne(API_ODONTOLOGOS).flush(ODONTOLOGOS);
    httpMock.expectOne(API_CALENDARIO).flush(CALENDARIO);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await montarComo('PACIENTE');
  });

  it('lee los tratamientos del catalogo publico', () => {
    expect(componente.tratamientos().map((t) => t.id)).toEqual(['tra-1']);
  });

  it('precarga el tratamiento que indica la URL', async () => {
    await montarComo('PACIENTE', { cita: CITA }, { tratamientoId: 'tra-1' });

    expect(componente.formulario.controls.tratamientoId.value).toBe('tra-1');
  });

  it('con el tratamiento precargado ya resuelve los odontologos aptos', async () => {
    await montarComo('PACIENTE', { cita: CITA }, { tratamientoId: 'tra-1' });
    await fixture.whenStable();

    expect(componente.odontologosAptos().map((o) => o.id)).toEqual(['odo-1']);
  });

  it('ignora un tratamientoId que no esta entre los activos', async () => {
    await montarComo('PACIENTE', { cita: CITA }, { tratamientoId: 'tra-2' });

    expect(componente.formulario.controls.tratamientoId.value).toBe('');
  });

  it('RN-08: solo ofrece los odontologos con la especialidad del tratamiento', async () => {
    componente.formulario.patchValue({ tratamientoId: 'tra-1' });
    await fixture.whenStable();

    expect(componente.odontologosAptos().map((o) => o.id)).toEqual(['odo-1']);
  });

  it('RN-08: al cambiar de tratamiento suelta al odontologo que deja de valer', async () => {
    componente.formulario.patchValue({ tratamientoId: 'tra-1', odontologoId: 'odo-1' });
    await fixture.whenStable();
    expect(componente.formulario.controls.odontologoId.value).toBe('odo-1');

    componente.formulario.patchValue({ tratamientoId: '' });
    await fixture.whenStable();

    expect(componente.formulario.controls.odontologoId.value).toBe('');
  });

  it('omite odontologoId cuando se consulta «cualquier odontologo»', async () => {
    componente.formulario.patchValue({
      tratamientoId: 'tra-1',
      odontologoId: '',
      dia: DIA,
    });
    await fixture.whenStable();
    componente.consultar();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('tratamientoId')).toBe('tra-1');
    expect(req.request.params.get('desde')).toBe(iso(DIA));
    expect(req.request.params.has('odontologoId')).toBe(false);
    req.flush(RESPUESTA);
  });

  it('envia odontologoId cuando se elige uno concreto', async () => {
    const suyo = primerDiaQueAtiende([1, 3, 5]);
    componente.formulario.patchValue({ tratamientoId: 'tra-1' });
    await fixture.whenStable();
    componente.formulario.patchValue({ odontologoId: 'odo-1' });
    await fixture.whenStable();
    componente.formulario.patchValue({ dia: suyo });
    componente.consultar();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('odontologoId')).toBe('odo-1');
    expect(req.request.params.get('desde')).toBe(iso(suyo));
    req.flush(RESPUESTA);
  });

  it('muestra las franjas agrupadas de treinta en treinta', async () => {
    componente.formulario.patchValue({
      tratamientoId: 'tra-1',
      dia: DIA,
    });
    await fixture.whenStable();
    componente.consultar();
    httpMock.expectOne((r) => r.url === API).flush(RESPUESTA);
    await fixture.whenStable();

    expect(componente.dias()[0].bloques.map((b) => b.inicio)).toEqual(['09:00', '09:30']);
  });

  it('pinta cada dia con sus franjas y quien las atiende', async () => {
    componente.formulario.patchValue({
      tratamientoId: 'tra-1',
      dia: DIA,
    });
    await fixture.whenStable();
    componente.consultar();
    httpMock.expectOne((r) => r.url === API).flush(RESPUESTA);
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    const encabezado = raiz.querySelector('.dia h2')?.textContent?.trim().toLowerCase();
    expect(encabezado).toBe('lunes 14 de setiembre');

    const horas = [...raiz.querySelectorAll('.franja .hora')].map((e) => e.textContent?.trim());
    expect(horas).toEqual(['09:00', '09:30']);

    const quien = [...raiz.querySelectorAll('.franja .quien')].map((e) => e.textContent?.trim());
    expect(quien).toEqual(['Juan Pérez', 'Juan Pérez']);
  });

  it('avisa cuando el rango no tiene ninguna franja', async () => {
    componente.formulario.patchValue({
      tratamientoId: 'tra-1',
      dia: DIA,
    });
    await fixture.whenStable();
    componente.consultar();
    httpMock.expectOne((r) => r.url === API).flush({ ...RESPUESTA, odontologos: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.vacio')?.textContent).toContain('No hay franjas disponibles');
    expect(raiz.querySelectorAll('.franja')).toHaveLength(0);
  });

  it('el bloque de media hora conserva los inicios exactos que contiene', async () => {
    componente.formulario.patchValue({
      tratamientoId: 'tra-1',
      dia: DIA,
    });
    await fixture.whenStable();
    componente.consultar();
    httpMock.expectOne((r) => r.url === API).flush(RESPUESTA);
    await fixture.whenStable();

    expect(componente.dias()[0].bloques[0].inicios).toEqual(['09:00', '09:15']);
    expect(componente.dias()[0].bloques[1].inicios).toEqual(['09:30']);
  });

  it('el dia elegido viaja en los dos extremos del rango', async () => {
    componente.formulario.patchValue({ tratamientoId: 'tra-1', dia: DIA });
    await fixture.whenStable();
    componente.consultar();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('desde')).toBe(iso(DIA));
    expect(req.request.params.get('hasta')).toBe(iso(DIA));
    req.flush(RESPUESTA);
  });

  it('el calendario no admite un dia fuera de la ventana consultable', async () => {
    componente.formulario.patchValue({ tratamientoId: 'tra-1', dia: hoyMas(20) });
    await fixture.whenStable();

    expect(componente.formulario.controls.dia.hasError('matDatepickerMax')).toBe(true);
    expect(componente.formulario.invalid).toBe(true);
    componente.consultar();
    httpMock.verify();
  });

  it('muestra el mensaje del servidor cuando la consulta falla', async () => {
    componente.formulario.patchValue({
      tratamientoId: 'tra-1',
      dia: DIA,
    });
    await fixture.whenStable();
    componente.consultar();

    httpMock
      .expectOne((r) => r.url === API)
      .flush({ message: 'Tratamiento no encontrado' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(componente.error()).toBe('Tratamiento no encontrado');
    expect(componente.dias()).toEqual([]);
  });


  async function consultarConResultado(): Promise<void> {
    componente.formulario.patchValue({
      tratamientoId: 'tra-1',
      dia: DIA,
    });
    await fixture.whenStable();
    componente.consultar();
    httpMock.expectOne((r) => r.url === API).flush(RESPUESTA);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('para el PACIENTE la franja es un boton', async () => {
    await consultarConResultado();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(componente.puedeReservar()).toBe(true);
    expect(raiz.querySelectorAll('button.franja').length).toBeGreaterThan(0);
    expect(raiz.querySelector('button.franja')?.getAttribute('aria-label')).toContain('Reservar');
  });

  it('HU-14: para RECEPCIONISTA sin paciente elegido la franja todavia no es un boton', async () => {
    await montarComo('RECEPCIONISTA');
    await consultarConResultado();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(componente.reservaParaOtro()).toBe(true);
    expect(componente.puedeReservar()).toBe(false);
    expect(raiz.querySelectorAll('button.franja')).toHaveLength(0);
  });

  it('HU-14: con el paciente elegido, RECEPCIONISTA ya puede reservar', async () => {
    await montarComo('RECEPCIONISTA');
    componente.elegirPaciente(PACIENTE);
    await consultarConResultado();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(componente.puedeReservar()).toBe(true);
    expect(raiz.querySelectorAll('button.franja').length).toBeGreaterThan(0);
  });

  it('HU-14: pasa al dialogo la ficha del paciente elegido', async () => {
    await montarComo('RECEPCIONISTA');
    componente.elegirPaciente(PACIENTE);
    await consultarConResultado();

    componente.abrirReserva(componente.dias()[0], componente.dias()[0].bloques[0]);
    await fixture.whenStable();

    const datos = datosAbiertos[0] as { paciente?: { id: string; numeroHistoria: string } };
    expect(datos.paciente?.id).toBe('fic-9');
    expect(datos.paciente?.numeroHistoria).toBe('HC-00042');
  });

  it('HU-09: al PACIENTE no se le pasa ficha al dialogo, aunque exista el campo', async () => {
    await consultarConResultado();

    componente.abrirReserva(componente.dias()[0], componente.dias()[0].bloques[0]);
    await fixture.whenStable();

    const datos = datosAbiertos[0] as { paciente?: unknown };
    expect(datos.paciente).toBeUndefined();
  });

  it('tras reservar deja el codigo a la vista y repite la consulta', async () => {
    await consultarConResultado();

    componente.abrirReserva(componente.dias()[0], componente.dias()[0].bloques[0]);
    await fixture.whenStable();

    httpMock.expectOne((r) => r.url === API).flush({ ...RESPUESTA, odontologos: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(componente.ultimaReserva()?.codigo).toBe('CIT-000123');
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.reservada')?.textContent).toContain('CIT-000123');
    expect(abiertos).toHaveLength(2);
  });

  it('HU-10: el 409 avisa y recalcula la disponibilidad (RF-16)', async () => {
    const aviso = 'Esa franja ya no esta disponible. Vuelve a consultar la disponibilidad.';
    await montarComo('PACIENTE', { recargar: aviso });
    await consultarConResultado();

    const abrirAviso = vi.spyOn(TestBed.inject(MatSnackBar), 'open');

    componente.abrirReserva(componente.dias()[0], componente.dias()[0].bloques[0]);
    await fixture.whenStable();

    expect(abrirAviso).toHaveBeenCalledWith(aviso, 'Cerrar', { duration: 8000 });

    httpMock.expectOne((r) => r.url === API).flush({ ...RESPUESTA, odontologos: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(componente.dias()).toEqual([]);
    expect(componente.ultimaReserva()).toBeNull();
    expect(abiertos).toHaveLength(1);
  });

  it('si se cancela el dialogo no se reserva ni se recarga', async () => {
    await montarComo('PACIENTE', null);
    await consultarConResultado();

    componente.abrirReserva(componente.dias()[0], componente.dias()[0].bloques[0]);
    await fixture.whenStable();

    expect(componente.ultimaReserva()).toBeNull();
    expect(abiertos).toHaveLength(1);
    httpMock.verify();
  });


  it('el calendario no admite el domingo ni un feriado', async () => {
    await montarComo('PACIENTE');

    const admite = componente.soloDiasConAtencion();
    expect(admite(new Date(2026, 9, 12))).toBe(true);
    expect(admite(new Date(2026, 9, 11))).toBe(false);
    expect(admite(new Date(2026, 6, 28))).toBe(false);
  });

  it('elegir odontologo estrecha el calendario a los dias de esa persona', async () => {
    await montarComo('PACIENTE');

    componente.formulario.patchValue({ odontologoId: 'odo-1' });
    await fixture.whenStable();

    const admite = componente.soloDiasConAtencion();
    expect(admite(new Date(2026, 9, 12))).toBe(true);
    expect(admite(new Date(2026, 9, 13))).toBe(false);
  });


  function respuestaPara(fecha: Date): DisponibilidadResponse {
    return {
      ...RESPUESTA,
      desde: iso(fecha),
      hasta: iso(fecha),
      odontologos: [
        {
          ...RESPUESTA.odontologos[0],
          dias: [{ fecha: iso(fecha), inicios: ['09:00:00', '09:15:00', '09:30:00'] }],
        },
      ],
    };
  }

  it('el visitante consulta sin sesion y ve las franjas como botones', async () => {
    await montarComo(null);
    await consultarConResultado();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(componente.visitante()).toBe(true);
    expect(componente.puedeReservar()).toBe(true);
    expect(raiz.querySelectorAll('button.franja').length).toBeGreaterThan(0);
  });

  it('al elegir una franja sin sesion pide identificarse, con la busqueda en el returnUrl', async () => {
    await montarComo(null);
    await consultarConResultado();

    componente.abrirReserva(componente.dias()[0], componente.dias()[0].bloques[1]);
    await fixture.whenStable();

    expect(abiertos).toEqual([IdentificarseDialogo]);
    const { returnUrl } = datosAbiertos[0] as { returnUrl: string };
    expect(returnUrl).toContain('/disponibilidad?');
    expect(returnUrl).toContain('tratamientoId=tra-1');
    expect(returnUrl).toContain('dia=2026-09-14');
    expect(returnUrl).toContain('inicio=09:30');
    expect(returnUrl).not.toContain('odontologoId');
  });

  it('al volver con la busqueda en la URL consulta sola y reabre la franja elegida', async () => {
    const suyo = primerDiaQueAtiende([1, 3, 5]);
    await montarComo(
      'PACIENTE',
      { cita: CITA },
      { tratamientoId: 'tra-1', odontologoId: 'odo-1', dia: iso(suyo), inicio: '09:00' },
    );

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('odontologoId')).toBe('odo-1');
    expect(req.request.params.get('desde')).toBe(iso(suyo));
    req.flush(respuestaPara(suyo));
    await fixture.whenStable();

    expect(abiertos[0]).toBe(ReservarDialogo);
    const datos = datosAbiertos[0] as { fecha: string; bloque: { inicio: string } };
    expect(datos.fecha).toBe(iso(suyo));
    expect(datos.bloque.inicio).toBe('09:00');

    httpMock.expectOne((r) => r.url === API).flush({ ...RESPUESTA, odontologos: [] });
  });

  it('si la franja elegida ya no se ofrece al volver, avisa y no abre la reserva', async () => {
    const suyo = primerDiaQueAtiende([1, 3, 5]);
    await montarComo(
      'PACIENTE',
      { cita: CITA },
      { tratamientoId: 'tra-1', dia: iso(suyo), inicio: '11:00' },
    );
    const abrirAviso = vi.spyOn(TestBed.inject(MatSnackBar), 'open');

    httpMock.expectOne((r) => r.url === API).flush(respuestaPara(suyo));
    await fixture.whenStable();

    expect(abrirAviso).toHaveBeenCalled();
    expect(abiertos).toHaveLength(0);
    expect(componente.dias()[0].bloques.length).toBeGreaterThan(0);
  });

  it('recepcion que vuelve con la franja en la URL no abre la reserva sin paciente', async () => {
    const suyo = primerDiaQueAtiende([1, 3, 5]);
    await montarComo(
      'RECEPCIONISTA',
      { cita: CITA },
      { tratamientoId: 'tra-1', dia: iso(suyo), inicio: '09:00' },
    );

    httpMock.expectOne((r) => r.url === API).flush(respuestaPara(suyo));
    await fixture.whenStable();

    expect(abiertos).toHaveLength(0);
  });

  it('ignora un dia de la URL fuera de la ventana consultable', async () => {
    await montarComo('PACIENTE', { cita: CITA }, { tratamientoId: 'tra-1', dia: iso(hoyMas(30)) });

    expect(componente.formulario.controls.tratamientoId.value).toBe('tra-1');
    httpMock.expectNone((r) => r.url === API);
  });
});
