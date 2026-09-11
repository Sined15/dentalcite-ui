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
import { PageResponse } from '../../core/http/api.types';
import {
  Cita,
  DisponibilidadResponse,
  Especialidad,
  Odontologo,
  Paciente,
  Tratamiento,
} from '../../models';
import { Disponibilidad } from './disponibilidad';
import { ReservarResultado } from './reservar-dialogo';

const API = `${environment.apiUrl}/api/v1/disponibilidad`;
const API_TRATAMIENTOS = `${environment.apiUrl}/api/v1/tratamientos`;
const API_ODONTOLOGOS = `${environment.apiUrl}/api/v1/odontologos`;

const ENDODONCIA: Especialidad = {
  id: 'esp-1',
  nombre: 'ENDODONCIA',
  descripcion: null,
  activo: true,
  imagenUrl: null,
};
const ORTODONCIA: Especialidad = {
  id: 'esp-2',
  nombre: 'ORTODONCIA',
  descripcion: null,
  activo: true,
  imagenUrl: null,
};

const TRATAMIENTOS: Tratamiento[] = [
  {
    id: 'tra-1',
    codigo: 'T-001',
    nombre: 'Endodoncia',
    descripcion: null,
    duracionMinutos: 30,
    especialidad: ENDODONCIA,
    activo: true,
    imagenUrl: null,
  },
  {
    id: 'tra-2',
    codigo: 'T-002',
    nombre: 'Tratamiento retirado',
    descripcion: null,
    duracionMinutos: 30,
    especialidad: ENDODONCIA,
    activo: false,
    imagenUrl: null,
  },
];

function odontologo(id: string, nombres: string, especialidades: Especialidad[]): Odontologo {
  return {
    id,
    cop: `COP-${id}`,
    nombres,
    apellidos: 'Apellido',
    fichaId: `fic-${id}`,
    activo: true,
    imagenUrl: null,
    especialidades,
  };
}

const ODONTOLOGOS: Odontologo[] = [
  odontologo('odo-1', 'Juan', [ENDODONCIA]),
  odontologo('odo-2', 'Ana', [ORTODONCIA]),
  { ...odontologo('odo-3', 'Baja', [ENDODONCIA]), activo: false },
];

function pagina<T>(content: T[]): PageResponse<T> {
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

/** Lo que devuelve el motor: granularidad de quince minutos (RN-04). */
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

/** Lo que devolveria la reserva; el dialogo se sustituye por un doble. */
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

/** La ficha que recepcion elige para reservar en su nombre (HU-14). */
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

/**
 * El formulario maneja fechas desde que el rango se elige en un calendario, asi
 * que las pruebas construyen dias locales y no cadenas.
 *
 * Y los construyen **relativos a hoy**, no en fechas fijas: el calendario acota
 * la ventana de RNF-01 entre hoy y hoy+13, de modo que un dia escrito a mano
 * caeria fuera en cuanto pasara esa fecha y la prueba se rompería sola.
 */
function hoyMas(dias: number): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
}

function iso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Un dia cualquiera dentro de la ventana consultable. */
const DIA = hoyMas(3);

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
  odontologosAptos: () => Odontologo[];
  tratamientos: () => Tratamiento[];
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
  paso: { set: (v: number) => void };
  consultar: () => void;
  error: () => string | null;
}

// El `TestBed` no monta `appConfig`, asi que sin esto el DatePipe caeria a
// en-US y la prueba del encabezado comprobaria un idioma que la aplicacion no
// usa. Se replica lo que hace `app.config.ts`.
registerLocaleData(localeEsPe);

/** JWT sin firmar: solo se decodifica el payload, como en auth.guards.spec.ts. */
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

  // Lo que devuelve `ReservarDialogo` al cerrarse, no una cita suelta: la
  // pantalla distingue «reservada» de «recarga esto» por la forma del objeto.
  async function montarComo(
    rol: string,
    cierraCon: ReservarResultado | null = { cita: CITA },
    query: Record<string, string> = {},
  ): Promise<void> {
    TestBed.resetTestingModule();
    localStorage.clear();
    localStorage.setItem('dentalcite.token', sesionCon(rol));
    // El overlay de Material no aporta nada aqui: interesa que el flujo de
    // reserva encadene bien, no como se pinta el dialogo (eso es su propio spec).
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
        // Despues de `provideRouter`, que tambien declara `ActivatedRoute`: aqui
        // solo interesa la query con la que se entra a la pantalla.
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Disponibilidad);
    componente = fixture.componentInstance as unknown as Interno;

    // El componente carga los dos catalogos en el constructor.
    httpMock.expectOne((r) => r.url === API_TRATAMIENTOS).flush(pagina(TRATAMIENTOS));
    httpMock.expectOne((r) => r.url === API_ODONTOLOGOS).flush(pagina(ODONTOLOGOS));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    // El destinatario de HU-09 es el paciente; los casos de otros roles lo dicen.
    await montarComo('PACIENTE');
  });

  it('descarta del selector los tratamientos dados de baja', () => {
    expect(componente.tratamientos().map((t) => t.id)).toEqual(['tra-1']);
  });

  /**
   * HU-06 (v4): se llega aqui desde «pedir cita» en el detalle de una
   * especialidad. Si el tratamiento no viniera ya elegido, el visitante tendria
   * que volver a buscarlo en el desplegable y el enlace no serviria de nada.
   */
  it('precarga el tratamiento que indica la URL', async () => {
    await montarComo('PACIENTE', { cita: CITA }, { tratamientoId: 'tra-1' });

    expect(componente.formulario.controls.tratamientoId.value).toBe('tra-1');
  });

  it('con el tratamiento precargado ya resuelve los odontologos aptos', async () => {
    await montarComo('PACIENTE', { cita: CITA }, { tratamientoId: 'tra-1' });
    await fixture.whenStable();

    // Lo mismo que si lo hubiera elegido a mano: RN-08 se aplica igual.
    expect(componente.odontologosAptos().map((o) => o.id)).toEqual(['odo-1']);
  });

  it('ignora un tratamientoId que no esta entre los activos', async () => {
    // `tra-2` esta dado de baja: dejarlo elegido pondria en el desplegable un
    // identificador sin etiqueta que mostrar.
    await montarComo('PACIENTE', { cita: CITA }, { tratamientoId: 'tra-2' });

    expect(componente.formulario.controls.tratamientoId.value).toBe('');
  });

  it('RN-08: solo ofrece los odontologos con la especialidad del tratamiento', async () => {
    componente.formulario.patchValue({ tratamientoId: 'tra-1' });
    await fixture.whenStable();

    // Ana es de ortodoncia y el tercero esta de baja: queda Juan.
    expect(componente.odontologosAptos().map((o) => o.id)).toEqual(['odo-1']);
  });

  it('RN-08: al cambiar de tratamiento suelta al odontologo que deja de valer', async () => {
    componente.formulario.patchValue({ tratamientoId: 'tra-1', odontologoId: 'odo-1' });
    await fixture.whenStable();
    expect(componente.formulario.controls.odontologoId.value).toBe('odo-1');

    // Sin tratamiento no hay especialidad exigida: nadie es apto.
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
    // Ausente, no vacio: el parametro vacio no significa «cualquiera».
    expect(req.request.params.has('odontologoId')).toBe(false);
    req.flush(RESPUESTA);
  });

  it('envia odontologoId cuando se elige uno concreto', async () => {
    componente.formulario.patchValue({ tratamientoId: 'tra-1' });
    await fixture.whenStable();
    componente.formulario.patchValue({ odontologoId: 'odo-1' });
    await fixture.whenStable();
    componente.consultar();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('odontologoId')).toBe('odo-1');
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
    // Las senales pueden estar bien y la plantilla no pintarlas: esta prueba
    // mira el DOM, que es lo que ve el paciente.
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
    // 2026-09-14 es lunes. Que el encabezado lo diga en espanol es parte de la
    // pantalla: el DatePipe usa el LOCALE_ID que la aplicacion configura.
    // «setiembre» no es una errata: es la grafia de es-PE.
    const encabezado = raiz.querySelector('.dia h2')?.textContent?.trim().toLowerCase();
    expect(encabezado).toBe('lunes 14 de setiembre');

    const horas = [...raiz.querySelectorAll('.franja .hora')].map((e) => e.textContent?.trim());
    expect(horas).toEqual(['09:00', '09:30']);

    // Un solo odontologo: se muestra su nombre, no un recuento.
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

  it('el conmutador de quince minutos reexpande sin volver a pedir', async () => {
    componente.formulario.patchValue({
      tratamientoId: 'tra-1',
      dia: DIA,
    });
    await fixture.whenStable();
    componente.consultar();
    httpMock.expectOne((r) => r.url === API).flush(RESPUESTA);
    await fixture.whenStable();

    componente.paso.set(15);

    expect(componente.dias()[0].bloques.map((b) => b.inicio)).toEqual(['09:00', '09:15', '09:30']);
    // Agrupar es cliente: ninguna peticion nueva.
    httpMock.verify();
  });

  it('el dia elegido viaja en los dos extremos del rango', async () => {
    // La API pregunta por rango y la pantalla por un dia: se le manda el mismo
    // en `desde` y en `hasta`, que es un rango de un solo dia.
    componente.formulario.patchValue({ tratamientoId: 'tra-1', dia: DIA });
    await fixture.whenStable();
    componente.consultar();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.params.get('desde')).toBe(iso(DIA));
    expect(req.request.params.get('hasta')).toBe(iso(DIA));
    req.flush(RESPUESTA);
  });

  it('el calendario no admite un dia fuera de la ventana consultable', async () => {
    // La ventana de RNF-01 esta puesta como limite del propio calendario, asi
    // que el dia veinte ni siquiera se puede marcar: el control lo rechaza sin
    // que haga falta llegar al aviso de «rango demasiado largo».
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

  // ------------------------------------------------------------------
  // HU-09 · reserva desde la pantalla
  // ------------------------------------------------------------------

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

  it('para el ODONTOLOGO la franja es informacion, no un boton', async () => {
    // Reservar en nombre de otro es HU-14: un boton que devolviera 403 al
    // pulsarlo seria un fallo de diseno, no una barrera.
    await montarComo('ODONTOLOGO');
    await consultarConResultado();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(componente.puedeReservar()).toBe(false);
    expect(raiz.querySelectorAll('button.franja')).toHaveLength(0);
    expect(raiz.querySelectorAll('.franja').length).toBeGreaterThan(0);
  });

  it('HU-14: para RECEPCIONISTA sin paciente elegido la franja todavia no es un boton', async () => {
    // El servidor respondería 400 —«indique el paciente»—, así que ofrecer el
    // botón sería mandar a pulsar algo que no puede funcionar.
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
    // Mandarla daría 403 incluso siendo la suya: la clave no debe viajar.
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

    // La franja tomada no puede seguir ofreciendose: se vuelve a preguntar.
    httpMock.expectOne((r) => r.url === API).flush({ ...RESPUESTA, odontologos: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(componente.ultimaReserva()?.codigo).toBe('CIT-000123');
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.reservada')?.textContent).toContain('CIT-000123');
    // Se abrieron los dos dialogos: la confirmacion y el comprobante.
    expect(abiertos).toHaveLength(2);
  });

  it('HU-10: el 409 avisa y recalcula la disponibilidad (RF-16)', async () => {
    // La otra mitad del criterio: `reservar-dialogo.spec.ts` comprueba que el
    // 409 cierra el dialogo pidiendo recargar; aqui se comprueba que la
    // pantalla obedece, porque RF-16 exige «informando y recalculando».
    const aviso = 'Esa franja ya no esta disponible. Vuelve a consultar la disponibilidad.';
    await montarComo('PACIENTE', { recargar: aviso });
    await consultarConResultado();

    const abrirAviso = vi.spyOn(TestBed.inject(MatSnackBar), 'open');

    componente.abrirReserva(componente.dias()[0], componente.dias()[0].bloques[0]);
    await fixture.whenStable();

    expect(abrirAviso).toHaveBeenCalledWith(aviso, 'Cerrar', { duration: 8000 });

    // Recalcular no es opcional: la lista que el paciente tiene delante ya no
    // vale, y esta vez el motor ya no ofrece la franja.
    httpMock.expectOne((r) => r.url === API).flush({ ...RESPUESTA, odontologos: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(componente.dias()).toEqual([]);
    // No hubo cita: ni comprobante ni codigo a la vista.
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
});
