import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CalendarioPublico,
  EspecialidadDetalle,
  EspecialidadPublica,
  OdontologoPublico,
  TratamientoPublico,
} from '../models';

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

  calendario(): Observable<CalendarioPublico> {
    return this.http.get<CalendarioPublico>(`${this.url}/calendario`);
  }
}
