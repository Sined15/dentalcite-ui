import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageQuery, PageResponse } from '../core/http/api.types';
import { CierreSesionRequest, Plan, PlanRequest, SuspensionRequest } from '../models';
import { buildPageParams } from './pagination.util';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/planes`;

  deFicha(pacienteId: string): Observable<Plan[]> {
    return this.http.get<Plan[]>(this.url, {
      params: new HttpParams().set('pacienteId', pacienteId),
    });
  }

  obtener(id: string): Observable<Plan> {
    return this.http.get<Plan>(`${this.url}/${id}`);
  }

  seguimiento(soloActivos: boolean, pagina: PageQuery = {}): Observable<PageResponse<Plan>> {
    return this.http.get<PageResponse<Plan>>(`${this.url}/seguimiento`, {
      params: buildPageParams(pagina).set('soloActivos', String(soloActivos)),
    });
  }

  crear(body: PlanRequest): Observable<Plan> {
    return this.http.post<Plan>(this.url, body);
  }

  suspender(id: string, motivo: string): Observable<Plan> {
    const body: SuspensionRequest = { motivo };
    return this.http.patch<Plan>(`${this.url}/${id}/suspender`, body);
  }

  cerrarSesion(planId: string, numero: number, body: CierreSesionRequest): Observable<Plan> {
    return this.http.post<Plan>(`${this.url}/${planId}/sesiones/${numero}/cierre`, body);
  }
}
