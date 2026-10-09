import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageQuery, PageResponse } from '../core/http/api.types';
import {
  CambioPasswordRequest,
  Usuario,
  UsuarioReplaceRequest,
  UsuarioRequest,
  UsuarioUpdateRequest,
} from '../models';
import { buildPageParams } from './pagination.util';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/usuarios`;

  obtenerPerfilPropio(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/me`);
  }

  listar(query: PageQuery = {}): Observable<PageResponse<Usuario>> {
    return this.http.get<PageResponse<Usuario>>(this.url, { params: buildPageParams(query) });
  }

  obtener(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/${id}`);
  }

  crear(body: UsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, body);
  }

  reemplazar(id: string, body: UsuarioReplaceRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}`, body);
  }

  actualizar(id: string, body: UsuarioUpdateRequest): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.url}/${id}`, body);
  }

  darDeBaja(id: string): Observable<Usuario> {
    return this.actualizar(id, { activo: false });
  }

  asignarPasswordProvisional(id: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/password-provisional`, { password });
  }

  cambiarPasswordPropio(body: CambioPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.url}/me/password`, body);
  }
}
