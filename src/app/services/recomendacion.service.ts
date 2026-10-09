import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Recomendacion } from '../models';

@Injectable({ providedIn: 'root' })
export class RecomendacionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/recomendaciones`;

  listar(): Observable<Recomendacion[]> {
    return this.http.get<Recomendacion[]>(this.url);
  }
}
