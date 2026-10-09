import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageQuery, PageResponse } from '../core/http/api.types';
import { Paciente, PacienteDetalle, PacienteRequest, PacienteUpdateRequest } from '../models';
import { buildPageParams } from './pagination.util';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/pacientes`;

  crear(body: PacienteRequest): Observable<Paciente> {
    return this.http.post<Paciente>(this.url, body);
  }

  buscar(q: string, pagina: PageQuery = {}): Observable<PageResponse<Paciente>> {
    let params = buildPageParams(pagina);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<PageResponse<Paciente>>(this.url, { params });
  }

  obtener(id: string): Observable<PacienteDetalle> {
    return this.http.get<PacienteDetalle>(`${this.url}/${id}`);
  }

  actualizar(id: string, body: PacienteUpdateRequest): Observable<PacienteDetalle> {
    return this.http.put<PacienteDetalle>(`${this.url}/${id}`, body);
  }
}
