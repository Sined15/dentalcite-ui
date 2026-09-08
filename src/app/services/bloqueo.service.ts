import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Bloqueo, BloqueoRequest } from '../models';

/**
 * El listado ya viene filtrado por rol en servidor: un ODONTOLOGO ve los suyos
 * y los de consultorio; recepcion y administracion ven todos.
 *
 * Un 409 en `crear` o `reemplazar` trae `citasActivas` en el cuerpo (RN-03).
 */
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

  /** DELETE real. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
