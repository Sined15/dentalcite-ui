import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MessageResponse } from '../core/http/api.types';
import { LoginRequest, RegistroRequest, TokenResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/auth`;

  login(body: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.url}/login`, body);
  }

  registrar(body: RegistroRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.url}/registro`, body);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.url}/logout`, null);
  }
}
