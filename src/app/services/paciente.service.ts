import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paciente, PacienteRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/pacientes`;

  /**
   * HU-12 · RECEPCIONISTA y ADMINISTRADOR. Devuelve la ficha con su numero de
   * historia, que es el dato que hay que leerle al paciente antes de que se
   * vaya del mostrador.
   */
  crear(body: PacienteRequest): Observable<Paciente> {
    return this.http.post<Paciente>(this.url, body);
  }
}
