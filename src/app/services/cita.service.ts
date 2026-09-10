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
} from '../models';
import { buildPageParams } from './pagination.util';

/**
 * Citas: reserva desde el portal (HU-09 · RF-15) y agenda de recepcion
 * (HU-11 · RF-18, RF-20, RF-21).
 *
 * Respuestas que hay que distinguir: 422 si la franja incumple la ventana de
 * reserva (RN-05) y 409 si la cuota de citas activas esta agotada (RN-07), si la
 * franja dejo de estar disponible, o si se intenta cancelar algo que ya no esta
 * CONFIRMADO.
 */
@Injectable({ providedIn: 'root' })
export class CitaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/citas`;

  /** HU-09 · PACIENTE, y solo para si mismo. */
  reservar(body: CitaRequest): Observable<Cita> {
    return this.http.post<Cita>(this.url, body);
  }

  /**
   * HU-11 · RECEPCIONISTA y ADMINISTRADOR.
   *
   * El orden por hora lo pone el servidor por defecto, asi que no se manda:
   * mandarlo aqui obligaria a mantener las dos copias de acuerdo.
   */
  listar(filtros: CitaQuery, pagina: PageQuery = {}): Observable<PageResponse<CitaResumen>> {
    let params = buildPageParams(pagina).set('desde', filtros.desde).set('hasta', filtros.hasta);
    // Ausente, no vacio: un parametro vacio no significa «todos» para el servidor.
    if (filtros.odontologoId) {
      params = params.set('odontologoId', filtros.odontologoId);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<PageResponse<CitaResumen>>(this.url, { params });
  }

  /** HU-11 · RF-20. Sin ventana: recepcion cancela incluso a ultima hora. */
  cancelar(id: string, motivo: string): Observable<Cita> {
    const body: CancelacionRequest = { motivo };
    return this.http.patch<Cita>(`${this.url}/${id}/cancelar`, body);
  }

  /** HU-11 · RF-21. Las transiciones de la cita, en orden cronologico. */
  historial(id: string): Observable<CitaHistorial[]> {
    return this.http.get<CitaHistorial[]>(`${this.url}/${id}/historial`);
  }
}
