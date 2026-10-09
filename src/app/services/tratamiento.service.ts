import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageQuery, PageResponse } from '../core/http/api.types';
import { Tratamiento, TratamientoRequest } from '../models';
import { buildPageParams } from './pagination.util';

@Injectable({ providedIn: 'root' })
export class TratamientoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/tratamientos`;

  listar(query: PageQuery = {}): Observable<PageResponse<Tratamiento>> {
    return this.http.get<PageResponse<Tratamiento>>(this.url, { params: buildPageParams(query) });
  }

  crear(body: TratamientoRequest): Observable<Tratamiento> {
    return this.http.post<Tratamiento>(this.url, body);
  }

  reemplazar(id: string, body: TratamientoRequest): Observable<Tratamiento> {
    return this.http.put<Tratamiento>(`${this.url}/${id}`, body);
  }

  darDeBaja(id: string): Observable<void> {
    return this.http.patch<void>(`${this.url}/${id}`, null);
  }
}
