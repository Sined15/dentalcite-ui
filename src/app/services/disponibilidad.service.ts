import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DisponibilidadQuery, DisponibilidadResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class DisponibilidadService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/disponibilidad`;

  consultar(query: DisponibilidadQuery): Observable<DisponibilidadResponse> {
    let params = new HttpParams()
      .set('tratamientoId', query.tratamientoId)
      .set('desde', query.desde)
      .set('hasta', query.hasta);

    if (query.odontologoId) {
      params = params.set('odontologoId', query.odontologoId);
    }

    return this.http.get<DisponibilidadResponse>(this.url, { params });
  }
}
