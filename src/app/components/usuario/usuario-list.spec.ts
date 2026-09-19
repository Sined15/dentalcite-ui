import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/api.types';
import { Odontologo, Rol, Usuario } from '../../models';
import { UsuarioList } from './usuario-list';

const USUARIOS = `${environment.apiUrl}/api/v1/usuarios`;
const ODONTOLOGOS = `${environment.apiUrl}/api/v1/odontologos`;

function cuenta(nombre: string, rol: Rol, fichaId: string | null): Usuario {
  return {
    id: `usr-${nombre.toLowerCase()}`,
    nombre,
    correo: `${nombre.toLowerCase()}@dentalcite.com`,
    rol,
    activo: true,
    requiereCambioPassword: false,
    tokensValidosDesde: '2026-09-01T00:00:00Z',
    fichaId,
  };
}

function registro(fichaId: string): Odontologo {
  return {
    id: `odo-${fichaId}`,
    cop: `COP-${fichaId}`,
    nombres: 'Luis',
    apellidos: 'Perez',
    fichaId,
    activo: true,
    imagenUrl: null,
    especialidades: [],
  };
}

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

interface Interno {
  rol: { set: (valor: Rol | '') => void };
  filas: () => Usuario[];
  leFaltaRegistro: (fila: Usuario) => boolean;
}

/**
 * Lo que se fija aquí es el cruce entre esta pantalla y la de pacientes, que es
 * donde se leía mal: son dos tablas distintas —credenciales y fichas— y la única
 * forma honesta de relacionarlas es fila a fila, por la ficha de cada cuenta. El
 * odontólogo es el caso que lo prueba: tiene `fichaId` para vincular su cuenta
 * con su registro, y aun así no se le enlaza, porque el padrón de pacientes ya
 * no considera suya esa ficha.
 *
 * Y lo segundo, el aviso de la cuenta a medias: la de odontólogo que no resuelve
 * a ningún registro profesional puede iniciar sesión y no puede ejercer nada de
 * lo suyo, y eso desde la tabla no se veía.
 */
describe('UsuarioList', () => {
  let fixture: ComponentFixture<UsuarioList>;
  let httpMock: HttpTestingController;
  let componente: Interno;

  const CUENTAS = [
    cuenta('Rosa', 'PACIENTE', 'fic-rosa'),
    cuenta('Luis', 'ODONTOLOGO', 'fic-luis'),
    cuenta('Sofia', 'ADMINISTRADOR', null),
  ];

  function montar(cuentas: Usuario[], registros: Odontologo[]): void {
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UsuarioList);
    componente = fixture.componentInstance as unknown as Interno;

    httpMock.expectOne((r) => r.url === USUARIOS).flush(pagina(cuentas));
    httpMock.expectOne((r) => r.url === ODONTOLOGOS).flush(pagina(registros));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsuarioList],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
      ],
    });
  });

  it('la cuenta que tiene ficha enlaza a ella, y la que no lleva un guion', async () => {
    montar(CUENTAS, [registro('fic-luis')]);
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    const enlaces = [...raiz.querySelectorAll('a[href^="/pacientes/"]')];
    expect(enlaces.map((e) => e.getAttribute('href'))).toEqual(['/pacientes/fic-rosa']);

    // Administracion y recepcion no necesitan historia clinica; el odontologo la
    // tiene pero no es una historia que consultar. El guion es un dato, no un
    // hueco por cargar.
    expect(raiz.querySelectorAll('.sin-ficha')).toHaveLength(2);
  });

  /**
   * El caso que obliga a mirar el rol y no solo `fichaId`: el odontólogo trae
   * ficha —vincula su cuenta con su registro— pero el servidor la da por
   * inexistente como paciente, así que enlazarla sería mandar a un 404.
   */
  it('el odontologo trae ficha y aun asi no se le enlaza', async () => {
    montar(CUENTAS, [registro('fic-luis')]);
    await fixture.whenStable();
    fixture.detectChanges();

    const luis = componente.filas().find((f) => f.rol === 'ODONTOLOGO');
    expect(luis?.fichaId).toBe('fic-luis');

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('a[href="/pacientes/fic-luis"]')).toBeNull();
  });

  it('el filtro por rol deja solo las cuentas de ese rol', async () => {
    montar(CUENTAS, [registro('fic-luis')]);
    componente.rol.set('PACIENTE');
    await fixture.whenStable();

    expect(componente.filas().map((f) => f.nombre)).toEqual(['Rosa']);
  });

  it('laCuentaDeOdontologo_conSuRegistro_noSeMarca', async () => {
    montar(CUENTAS, [registro('fic-luis')]);
    await fixture.whenStable();
    fixture.detectChanges();

    const luis = componente.filas().find((f) => f.rol === 'ODONTOLOGO') as Usuario;
    expect(componente.leFaltaRegistro(luis)).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Sin registro profesional',
    );
  });

  it('laCuentaDeOdontologo_sinRegistro_seMarca', async () => {
    montar(CUENTAS, []);
    await fixture.whenStable();
    fixture.detectChanges();

    const luis = componente.filas().find((f) => f.rol === 'ODONTOLOGO') as Usuario;
    expect(componente.leFaltaRegistro(luis)).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Sin registro profesional',
    );
  });

  /**
   * El ascenso de rol no crea ficha, así que una cuenta que nunca la tuvo puede
   * acabar como odontólogo sin nada contra lo que registrar. Se marca igual
   * —tampoco puede ejercer—, pero la acción de completarlo no tiene sentido.
   */
  it('laCuentaDeOdontologo_sinFicha_seMarcaIgual', async () => {
    const sinFicha = cuenta('Carmen', 'ODONTOLOGO', null);
    montar([sinFicha], []);
    await fixture.whenStable();

    expect(componente.leFaltaRegistro(sinFicha)).toBe(true);
  });

  it('lasCuentasDeOtrosRoles_sinRegistroProfesional_nuncaSeMarcan', async () => {
    montar(CUENTAS, []);
    await fixture.whenStable();

    const otras = componente.filas().filter((f) => f.rol !== 'ODONTOLOGO');
    expect(otras.map((f) => componente.leFaltaRegistro(f))).toEqual([false, false]);
  });
});
