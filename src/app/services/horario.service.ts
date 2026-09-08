import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Horario, HorarioRequest } from '../models';

/**
 * Los horarios cuelgan de su odontologo:
 * `/api/v1/odontologos/{odontologoId}/horarios`. Devuelven array plano, sin
 * paginar, y es uno de los dos unicos recursos con DELETE real.
 */
@Injectable({ providedIn: 'root' })
export class HorarioService {
  private readonly http = inject(HttpClient);

  private base(odontologoId: string): string {
    return `${environment.apiUrl}/api/v1/odontologos/${odontologoId}/horarios`;
  }

  listar(odontologoId: string): Observable<Horario[]> {
    return this.http.get<Horario[]>(this.base(odontologoId));
  }

  crear(odontologoId: string, body: HorarioRequest): Observable<Horario> {
    return this.http.post<Horario>(this.base(odontologoId), body);
  }

  reemplazar(odontologoId: string, horarioId: string, body: HorarioRequest): Observable<Horario> {
    return this.http.put<Horario>(`${this.base(odontologoId)}/${horarioId}`, body);
  }

  /** DELETE real: el tramo se elimina, no se da de baja. */
  eliminar(odontologoId: string, horarioId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(odontologoId)}/${horarioId}`);
  }
}
