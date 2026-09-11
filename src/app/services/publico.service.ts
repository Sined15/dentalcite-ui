import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EspecialidadDetalle,
  EspecialidadPublica,
  OdontologoPublico,
  TratamientoPublico,
} from '../models';

/**
 * El catalogo abierto (HU-06, v4). No lleva paginacion porque el backend no la
 * ofrece: son ocho especialidades, ocho tratamientos y siete odontologos.
 *
 * El interceptor no anade `Authorization` cuando no hay sesion, asi que estas
 * llamadas salen anonimas solas; con sesion abierta llevan el token y responden
 * igual, que es lo que permite reusar estas pantallas desde dentro del portal.
 */
@Injectable({ providedIn: 'root' })
export class PublicoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/publico`;

  tratamientos(): Observable<TratamientoPublico[]> {
    return this.http.get<TratamientoPublico[]>(`${this.url}/tratamientos`);
  }

  especialidades(): Observable<EspecialidadPublica[]> {
    return this.http.get<EspecialidadPublica[]>(`${this.url}/especialidades`);
  }

  especialidad(id: string): Observable<EspecialidadDetalle> {
    return this.http.get<EspecialidadDetalle>(`${this.url}/especialidades/${id}`);
  }

  odontologos(): Observable<OdontologoPublico[]> {
    return this.http.get<OdontologoPublico[]>(`${this.url}/odontologos`);
  }
}
