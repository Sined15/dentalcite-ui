import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageQuery, PageResponse } from '../core/http/api.types';
import { Paciente, PacienteDetalle, PacienteRequest, PacienteUpdateRequest } from '../models';
import { buildPageParams } from './pagination.util';

/**
 * Pacientes: alta presencial (HU-12 · RF-06), busqueda y ficha (HU-13 · RF-07,
 * RF-08).
 *
 * Respuestas que hay que distinguir: 409 si el documento ya esta registrado
 * (RN-10) y 403 si quien consulta la ficha no ha atendido a esa persona o no es
 * su titular (RNF-06).
 */
@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/pacientes`;

  /**
   * HU-12 · RECEPCIONISTA y ADMINISTRADOR. Devuelve la ficha con su numero de
   * historia, que es el dato que hay que leerle al paciente antes de que se
   * vaya del mostrador.
   */
  crear(body: PacienteRequest): Observable<Paciente> {
    return this.http.post<Paciente>(this.url, body);
  }

  /**
   * HU-13 · RF-07. Un unico termino para documento, apellido y numero de
   * historia.
   *
   * La paginacion es del **servidor**, no como en el catalogo: el listado de
   * pacientes crece sin techo, y traerlo entero para filtrar en cliente es justo
   * lo que RNF-02 mide.
   *
   * El termino vacio viaja **ausente**, no en blanco: para el servidor un
   * parametro vacio no significa «todos».
   */
  buscar(q: string, pagina: PageQuery = {}): Observable<PageResponse<Paciente>> {
    let params = buildPageParams(pagina);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<PageResponse<Paciente>>(this.url, { params });
  }

  /** HU-13 · RF-08. 403 si el rol no alcanza a esta ficha en concreto. */
  obtener(id: string): Observable<PacienteDetalle> {
    return this.http.get<PacienteDetalle>(`${this.url}/${id}`);
  }

  /** HU-13 · RF-08 · RECEPCIONISTA y ADMINISTRADOR. PUT: reemplazo total. */
  actualizar(id: string, body: PacienteUpdateRequest): Observable<PacienteDetalle> {
    return this.http.put<PacienteDetalle>(`${this.url}/${id}`, body);
  }
}
