import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageQuery, PageResponse } from '../core/http/api.types';
import { Especialidad, EspecialidadRequest } from '../models';
import { buildPageParams } from './pagination.util';

@Injectable({ providedIn: 'root' })
export class EspecialidadService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/especialidades`;

  listar(query: PageQuery = {}): Observable<PageResponse<Especialidad>> {
    return this.http.get<PageResponse<Especialidad>>(this.url, { params: buildPageParams(query) });
  }

  crear(body: EspecialidadRequest): Observable<Especialidad> {
    return this.http.post<Especialidad>(this.url, body);
  }

  reemplazar(id: string, body: EspecialidadRequest): Observable<Especialidad> {
    return this.http.put<Especialidad>(`${this.url}/${id}`, body);
  }

  darDeBaja(id: string): Observable<void> {
    return this.http.patch<void>(`${this.url}/${id}`, null);
  }
}
