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

  /** GET /me. Accesible a cualquier rol autenticado, sobre su propia cuenta. */
  obtenerPerfilPropio(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/me`);
  }

  listar(query: PageQuery = {}): Observable<PageResponse<Usuario>> {
    return this.http.get<PageResponse<Usuario>>(this.url, { params: buildPageParams(query) });
  }

  /** A diferencia del catalogo, aqui GET /{id} si existe. */
  obtener(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/${id}`);
  }

  /**
   * El alta puede devolver `passwordProvisional` cuando no se indico ninguna.
   * Es la unica vez que existe en claro.
   */
  crear(body: UsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, body);
  }

  /** PUT: reemplazo total, los tres campos obligatorios. */
  reemplazar(id: string, body: UsuarioReplaceRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}`, body);
  }

  /** PATCH: actualizacion parcial. La baja logica es `{ activo: false }`. */
  actualizar(id: string, body: UsuarioUpdateRequest): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.url}/${id}`, body);
  }

  darDeBaja(id: string): Observable<Usuario> {
    return this.actualizar(id, { activo: false });
  }

  asignarPasswordProvisional(id: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/password-provisional`, { password });
  }

  /** Unica ruta permitida mientras el token exija cambio de contraseña. */
  cambiarPasswordPropio(body: CambioPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.url}/me/password`, body);
  }
}
