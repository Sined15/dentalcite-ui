import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageQuery, PageResponse } from '../core/http/api.types';
import { Odontologo, OdontologoRequest } from '../models';
import { buildPageParams } from './pagination.util';

@Injectable({ providedIn: 'root' })
export class OdontologoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/odontologos`;

  listar(query: PageQuery = {}): Observable<PageResponse<Odontologo>> {
    return this.http.get<PageResponse<Odontologo>>(this.url, { params: buildPageParams(query) });
  }

  crear(body: OdontologoRequest): Observable<Odontologo> {
    return this.http.post<Odontologo>(this.url, body);
  }

  reemplazar(id: string, body: OdontologoRequest): Observable<Odontologo> {
    return this.http.put<Odontologo>(`${this.url}/${id}`, body);
  }

  /** Baja logica. 409 si el odontologo tiene citas activas (RN-12). */
  darDeBaja(id: string): Observable<void> {
    return this.http.patch<void>(`${this.url}/${id}`, null);
  }
}
