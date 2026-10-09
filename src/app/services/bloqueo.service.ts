import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Bloqueo, BloqueoRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class BloqueoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/bloqueos`;

  listar(): Observable<Bloqueo[]> {
    return this.http.get<Bloqueo[]>(this.url);
  }

  crear(body: BloqueoRequest): Observable<Bloqueo> {
    return this.http.post<Bloqueo>(this.url, body);
  }

  reemplazar(id: string, body: BloqueoRequest): Observable<Bloqueo> {
    return this.http.put<Bloqueo>(`${this.url}/${id}`, body);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
