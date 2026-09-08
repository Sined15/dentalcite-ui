import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Consultorio } from '../models';

/** Solo lectura: F-12 excluye el mantenimiento de consultorios por interfaz. */
@Injectable({ providedIn: 'root' })
export class ConsultorioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/consultorios`;

  listar(): Observable<Consultorio[]> {
    return this.http.get<Consultorio[]>(this.url);
  }
}
