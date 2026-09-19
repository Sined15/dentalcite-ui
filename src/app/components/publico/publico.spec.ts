import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import {
  EspecialidadDetalle,
  EspecialidadPublica,
  OdontologoPublico,
  TratamientoPublico,
} from '../../models';
import { EspecialidadDetalleComponent } from './especialidad-detalle';
import { EspecialidadesPublicas } from './especialidades-publicas';
import { OdontologosPublicos } from './odontologos-publicos';
import { Portada } from './portada';
import { PublicoLayout } from './publico-layout';

/**
 * El area publica (HU-06, v4). Lo que estas pruebas fijan no es que se pinte algo,
 * sino que se pinte **solo** lo que el criterio concede al visitante.
 */
const API = `${environment.apiUrl}/api/v1/publico`;

const ESPECIALIDADES: EspecialidadPublica[] = [
  { id: 'esp-1', nombre: 'Ortodoncia', imagenUrl: '/img/catalogo/especialidad-ortodoncia.svg' },
  { id: 'esp-2', nombre: 'Endodoncia', imagenUrl: null },
];

const TRATAMIENTOS: TratamientoPublico[] = [
  {
    id: 'tra-1',
    nombre: 'Profilaxis dental',
    descripcion: 'Limpieza dental completa.',
    duracionMinutos: 45,
    imagenUrl: '/img/catalogo/tratamiento-profilaxis.svg',
    especialidadId: 'esp-1',
    especialidadNombre: 'Ortodoncia',
  },
];

const ODONTOLOGOS: OdontologoPublico[] = [
  {
    id: 'odo-1',
    nombres: 'Luis',
    apellidos: 'Pérez',
    cop: 'COP-10001',
    imagenUrl: '/img/catalogo/odontologo-cop-10001.svg',
    especialidades: ['Odontología General', 'Ortodoncia'],
    especialidadIds: ['esp-1', 'esp-2'],
  },
];

const DETALLE: EspecialidadDetalle = {
  id: 'esp-1',
  nombre: 'Ortodoncia',
  imagenUrl: '/img/catalogo/especialidad-ortodoncia.svg',
  tratamientos: TRATAMIENTOS,
  odontologos: ODONTOLOGOS,
};

function texto(fixture: ComponentFixture<unknown>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

async function montar<T>(componente: Type<T>, entradas: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  const fixture = TestBed.createComponent(componente);
  for (const [nombre, valor] of Object.entries(entradas)) {
    fixture.componentRef.setInput(nombre, valor);
  }
  const http = TestBed.inject(HttpTestingController);
  return { fixture, http };
}

describe('Portada', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('anuncia los tratamientos que ofrece la clinica, con su duracion', async () => {
    const { fixture, http } = await montar(Portada);
    fixture.detectChanges();

    http.expectOne(`${API}/tratamientos`).flush(TRATAMIENTOS);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto(fixture)).toContain('Profilaxis dental');
    expect(texto(fixture)).toContain('45 minutos');
    http.verify();
  });
});

describe('EspecialidadesPublicas', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('pinta una imagen por especialidad y su nombre', async () => {
    const { fixture, http } = await montar(EspecialidadesPublicas);
    fixture.detectChanges();

    http.expectOne(`${API}/especialidades`).flush(ESPECIALIDADES);
    await fixture.whenStable();
    fixture.detectChanges();

    const imagenes = (fixture.nativeElement as HTMLElement).querySelectorAll('img');
    // La segunda no tiene imagen: cae en el marcador, no en un hueco roto.
    expect(imagenes.length).toBe(1);
    expect(imagenes[0].getAttribute('src')).toBe('/img/catalogo/especialidad-ortodoncia.svg');
    expect(texto(fixture)).toContain('Ortodoncia');
    expect(texto(fixture)).toContain('Endodoncia');
    http.verify();
  });

  it('no muestra descripcion ni estado: la API publica no los manda', async () => {
    const { fixture, http } = await montar(EspecialidadesPublicas);
    fixture.detectChanges();

    http.expectOne(`${API}/especialidades`).flush(ESPECIALIDADES);
    await fixture.whenStable();
    fixture.detectChanges();

    const contenido = texto(fixture);
    expect(contenido).not.toContain('Activa');
    expect(contenido).not.toContain('Editar');
    expect(contenido).not.toContain('Dar de baja');
    http.verify();
  });
});

describe('EspecialidadDetalle', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('lista los tratamientos de la especialidad y quien la ejerce', async () => {
    const { fixture, http } = await montar(EspecialidadDetalleComponent, { id: 'esp-1' });
    fixture.detectChanges();

    http.expectOne(`${API}/especialidades/esp-1`).flush(DETALLE);
    await fixture.whenStable();
    fixture.detectChanges();

    const contenido = texto(fixture);
    expect(contenido).toContain('Profilaxis dental');
    expect(contenido).toContain('Luis Pérez');
    expect(contenido).toContain('COP-10001');
    http.verify();
  });

  /**
   * El ultimo criterio de HU-06: «y podre pedir cita desde ahi». El enlace lleva
   * el tratamiento en la URL, que es lo que permite que la pantalla de
   * disponibilidad abra con el ya elegido; sin ese identificador el boton seria
   * un atajo a un formulario vacio.
   */
  it('cada tratamiento ofrece pedir cita con ese tratamiento en la URL', async () => {
    const { fixture, http } = await montar(EspecialidadDetalleComponent, { id: 'esp-1' });
    fixture.detectChanges();

    http.expectOne(`${API}/especialidades/esp-1`).flush(DETALLE);
    await fixture.whenStable();
    fixture.detectChanges();

    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a.cta');
    expect(boton?.textContent).toContain('Pedir cita');
    expect(boton?.getAttribute('href')).toBe('/disponibilidad?tratamientoId=tra-1');
    http.verify();
  });
});

describe('OdontologosPublicos', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('presenta cada odontologo como ficha con nombre, especialidad y COP', async () => {
    const { fixture, http } = await montar(OdontologosPublicos);
    fixture.detectChanges();

    http.expectOne(`${API}/odontologos`).flush(ODONTOLOGOS);
    await fixture.whenStable();
    fixture.detectChanges();

    const contenido = texto(fixture);
    expect(contenido).toContain('Luis Pérez');
    expect(contenido).toContain('Odontología General · Ortodoncia');
    // El COP se pinta tal cual: el valor ya lleva el prefijo, y esta prueba
    // llegó a fijar el «COP COP-10001» duplicado en vez de cazarlo.
    expect(contenido).toContain('COP-10001');
    expect(contenido).not.toContain('COP COP-10001');
    // RF-10 (v4) pide ficha, no tabla.
    expect((fixture.nativeElement as HTMLElement).querySelector('table')).toBeNull();
    http.verify();
  });
});

describe('PublicoLayout', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('ofrece iniciar sesion y registrarse cuando no hay token', async () => {
    localStorage.clear();
    const { fixture } = await montar(PublicoLayout);
    fixture.detectChanges();
    await fixture.whenStable();

    const contenido = texto(fixture);
    expect(contenido).toContain('Iniciar sesión');
    expect(contenido).toContain('Registrarse');
    expect(contenido).not.toContain('Ir a mi cuenta');
  });

  it('lleva a la consulta de franjas sin pedir cuenta', async () => {
    localStorage.clear();
    const { fixture } = await montar(PublicoLayout);
    fixture.detectChanges();
    await fixture.whenStable();

    const enlace = (fixture.nativeElement as HTMLElement).querySelector(
      'nav a[href="/disponibilidad"]',
    );
    expect(enlace?.textContent?.trim()).toBe('Pedir cita');
  });
});
