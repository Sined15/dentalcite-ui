import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Recomendacion } from '../models';

/**
 * El catalogo cerrado de cuidados · ODONTOLOGO y ADMINISTRADOR.
 *
 * Solo lectura, como los consultorios: el catalogo se carga con los datos semilla y
 * no se mantiene por interfaz. La API devuelve unicamente las vigentes, asi que aqui
 * no hay nada que filtrar.
 */
@Injectable({ providedIn: 'root' })
export class RecomendacionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/recomendaciones`;

  listar(): Observable<Recomendacion[]> {
    return this.http.get<Recomendacion[]>(this.url);
  }
}
