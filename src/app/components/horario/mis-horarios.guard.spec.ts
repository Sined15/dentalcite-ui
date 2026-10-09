import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, isObservable, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/api.types';
import { Odontologo, Usuario } from '../../models';
import { misHorariosGuard } from './mis-horarios.guard';


const API_USUARIOS = `${environment.apiUrl}/api/v1/usuarios/me`;
const API_ODONTOLOGOS = `${environment.apiUrl}/api/v1/odontologos`;

function pagina<T>(content: T[]): PageResponse<T> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

function odontologo(id: string, fichaId: string): Odontologo {
  return {
    id,
    cop: `COP-${id}`,
    nombres: 'Luis',
    apellidos: 'Pérez',
    fichaId,
    activo: true,
    imagenUrl: null,
    especialidades: [],
  };
}

describe('misHorariosGuard', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => localStorage.clear());

  function lanzar(): Promise<UrlTree> {
    const resultado = TestBed.runInInjectionContext(() =>
      misHorariosGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    return firstValueFrom(
      (isObservable(resultado) ? resultado : of(resultado)) as Observable<UrlTree>,
    );
  }

  function responderCon(usuario: Partial<Usuario>, odontologos: Odontologo[]): void {
    httpMock.expectOne(API_USUARIOS).flush(usuario);
    if (usuario.fichaId) {
      httpMock.expectOne((r) => r.url === API_ODONTOLOGOS).flush(pagina(odontologos));
    }
  }

  it('lleva al horario del odontologo que comparte ficha con la cuenta', async () => {
    const veredicto = lanzar();
    responderCon({ fichaId: 'fic-1' }, [odontologo('odo-9', 'fic-1'), odontologo('odo-2', 'fic-2')]);

    expect((await veredicto).toString()).toBe('/odontologos/odo-9/horarios');
  });

  it('una cuenta sin ficha no tiene registro que abrir', async () => {
    const veredicto = lanzar();
    responderCon({ fichaId: null }, []);

    expect((await veredicto).toString()).toBe('/sin-permiso');
  });

  it('una ficha sin registro de odontologo tampoco', async () => {
    const veredicto = lanzar();
    responderCon({ fichaId: 'fic-1' }, [odontologo('odo-2', 'fic-2')]);

    expect((await veredicto).toString()).toBe('/sin-permiso');
  });

  it('si la API falla, redirige en vez de dejar la navegacion colgada', async () => {
    const veredicto = lanzar();
    httpMock.expectOne(API_USUARIOS).flush('', { status: 500, statusText: 'Server Error' });

    expect((await veredicto).toString()).toBe('/sin-permiso');
  });
});
