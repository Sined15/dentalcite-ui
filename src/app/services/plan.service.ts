import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageQuery, PageResponse } from '../core/http/api.types';
import { CierreSesionRequest, Plan, PlanRequest, SuspensionRequest } from '../models';
import { buildPageParams } from './pagination.util';

/**
 * Planes de tratamiento (HU-17 · RF-23) · ODONTOLOGO y ADMINISTRADOR.
 *
 * Respuestas que hay que distinguir: 409 si el paciente ya tiene un plan activo
 * de ese tratamiento (RN-13) o si el plan ya estaba suspendido, y 403 si un
 * odontologo intenta planificar en nombre de otro o suspender un plan ajeno.
 */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/planes`;

  /** Los planes de un paciente, del mas reciente al mas antiguo. Sin paginar: son pocos. */
  deFicha(pacienteId: string): Observable<Plan[]> {
    return this.http.get<Plan[]>(this.url, {
      params: new HttpParams().set('pacienteId', pacienteId),
    });
  }

  /**
   * Un plan con su avance y todas sus sesiones. Al paciente y al odontologo un
   * plan que no existe les responde 403, igual que uno ajeno; solo al
   * administrador le responde 404.
   */
  obtener(id: string): Observable<Plan> {
    return this.http.get<Plan>(`${this.url}/${id}`);
  }

  /**
   * Los planes que sigue el odontologo autenticado: los que firmo y los de los
   * pacientes con alguna cita suya sin cancelar. El orden lo fija el servidor.
   */
  seguimiento(soloActivos: boolean, pagina: PageQuery = {}): Observable<PageResponse<Plan>> {
    return this.http.get<PageResponse<Plan>>(`${this.url}/seguimiento`, {
      params: buildPageParams(pagina).set('soloActivos', String(soloActivos)),
    });
  }

  crear(body: PlanRequest): Observable<Plan> {
    return this.http.post<Plan>(this.url, body);
  }

  /** RN-12: no borra nada; baja la marca de actividad y conserva el registro. */
  suspender(id: string, motivo: string): Observable<Plan> {
    const body: SuspensionRequest = { motivo };
    return this.http.patch<Plan>(`${this.url}/${id}/suspender`, body);
  }

  /**
   * Cierra una sesion con lo que el paciente debe hacer hasta la siguiente.
   *
   * Devuelve el plan entero y no solo la sesion, asi que quien lo llama puede
   * sustituir lo que tenia sin volver a consultar. Respuestas que hay que
   * distinguir: 409 si la sesion no tiene cita atendida o ya estaba cerrada, 403
   * si el plan lo creo otro odontologo.
   */
  cerrarSesion(planId: string, numero: number, body: CierreSesionRequest): Observable<Plan> {
    return this.http.post<Plan>(`${this.url}/${planId}/sesiones/${numero}/cierre`, body);
  }
}
