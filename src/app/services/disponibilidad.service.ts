import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DisponibilidadQuery, DisponibilidadResponse } from '../models';

/**
 * Motor de franjas (HU-08). Recurso de solo lectura y sin paginar: la respuesta
 * completa del rango llega de una vez, porque agrupar y filtrar catorce dias en
 * cliente es inmediato y paginarlo obligaria a ir y volver al cambiar de dia.
 *
 * Lo consulta cualquier rol autenticado, el paciente incluido.
 */
@Injectable({ providedIn: 'root' })
export class DisponibilidadService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/disponibilidad`;

  consultar(query: DisponibilidadQuery): Observable<DisponibilidadResponse> {
    let params = new HttpParams()
      .set('tratamientoId', query.tratamientoId)
      .set('desde', query.desde)
      .set('hasta', query.hasta);

    // Omitido a proposito cuando no hay eleccion: el parametro vacio no es lo
    // mismo que su ausencia, y es la ausencia la que significa «cualquiera».
    if (query.odontologoId) {
      params = params.set('odontologoId', query.odontologoId);
    }

    return this.http.get<DisponibilidadResponse>(this.url, { params });
  }
}
