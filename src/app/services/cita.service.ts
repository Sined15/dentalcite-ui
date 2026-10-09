import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageQuery, PageResponse } from '../core/http/api.types';
import {
  CancelacionRequest,
  Cita,
  CitaHistorial,
  CitaQuery,
  CitaRequest,
  CitaResumen,
  MisCitasQuery,
  ResultadoCita,
  ResultadoRequest,
} from '../models';
import { buildPageParams } from './pagination.util';

@Injectable({ providedIn: 'root' })
export class CitaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/citas`;

  reservar(body: CitaRequest): Observable<Cita> {
    return this.http.post<Cita>(this.url, body);
  }

  listar(filtros: CitaQuery, pagina: PageQuery = {}): Observable<PageResponse<CitaResumen>> {
    let params = buildPageParams(pagina).set('desde', filtros.desde).set('hasta', filtros.hasta);
    if (filtros.odontologoId) {
      params = params.set('odontologoId', filtros.odontologoId);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<PageResponse<CitaResumen>>(this.url, { params });
  }

  mias(filtros: MisCitasQuery = {}, pagina: PageQuery = {}): Observable<PageResponse<CitaResumen>> {
    let params = buildPageParams(pagina);
    if (filtros.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<PageResponse<CitaResumen>>(`${this.url}/mias`, { params });
  }

  cancelar(id: string, motivo: string): Observable<Cita> {
    const body: CancelacionRequest = { motivo };
    return this.http.patch<Cita>(`${this.url}/${id}/cancelar`, body);
  }

  pendientesDeCierre(pagina: PageQuery = {}): Observable<PageResponse<CitaResumen>> {
    return this.http.get<PageResponse<CitaResumen>>(`${this.url}/pendientes-cierre`, {
      params: buildPageParams(pagina),
    });
  }

  registrarResultado(id: string, resultado: ResultadoCita): Observable<Cita> {
    const body: ResultadoRequest = { resultado };
    return this.http.patch<Cita>(`${this.url}/${id}/resultado`, body);
  }

  historial(id: string): Observable<CitaHistorial[]> {
    return this.http.get<CitaHistorial[]>(`${this.url}/${id}/historial`);
  }
}
