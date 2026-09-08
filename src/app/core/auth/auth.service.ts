import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { JwtClaims, LoginRequest, RegistroRequest, Rol } from '../../models';
import { AuthApi } from '../../services/auth.api';
import { MessageResponse } from '../http/api.types';

const CLAVE_TOKEN = 'dentalcite.token';

/**
 * Estado de sesion del cliente.
 *
 * El JWT se decodifica aqui solo para saber a donde navegar: la firma no se
 * verifica y no se puede verificar sin el secreto. La autoridad sobre lo que
 * un usuario puede hacer es siempre el backend, que revalida cada peticion.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(leerTokenGuardado());

  readonly token = this._token.asReadonly();

  private readonly claims = computed<JwtClaims | null>(() => {
    const token = this._token();
    return token ? decodificarJwt(token) : null;
  });

  readonly usuarioId = computed<string | null>(() => this.claims()?.sub ?? null);
  readonly rol = computed<Rol | null>(() => this.claims()?.rol ?? null);
  readonly requiereCambioPassword = computed<boolean>(
    () => this.claims()?.requiere_cambio_password === true,
  );

  /** Un token caducado o ilegible cuenta como ausencia de sesion. */
  readonly estaAutenticado = computed<boolean>(() => {
    const claims = this.claims();
    if (!claims) {
      return false;
    }
    return claims.exp * 1000 > Date.now();
  });

  login(body: LoginRequest): Observable<{ token: string }> {
    return this.api.login(body).pipe(tap((res) => this.guardarToken(res.token)));
  }

  registrar(body: RegistroRequest): Observable<MessageResponse> {
    return this.api.registrar(body);
  }

  /**
   * Cierra sesion en servidor y en cliente. La sesion local muere aunque la
   * llamada falle: dejarla viva con un token que el backend ya revoco solo
   * produciria 401 en la siguiente pantalla.
   */
  logout(): void {
    this.api.logout().subscribe({
      next: () => this.limpiarYSalir(),
      error: () => this.limpiarYSalir(),
    });
  }

  /** Cierre local, sin llamar al backend. Lo usa el interceptor ante un 401. */
  limpiarSesion(): void {
    this._token.set(null);
    try {
      localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      // Almacenamiento no disponible: la senal ya es la fuente de verdad.
    }
  }

  /** Ruta inicial segun el rol, para no aterrizar en una pantalla sin permiso. */
  rutaInicial(): string {
    switch (this.rol()) {
      case 'ADMINISTRADOR':
        return '/usuarios';
      case 'ODONTOLOGO':
        return '/bloqueos';
      case 'RECEPCIONISTA':
        return '/bloqueos';
      case 'PACIENTE':
        return '/perfil';
      default:
        return '/login';
    }
  }

  private guardarToken(token: string): void {
    this._token.set(token);
    try {
      localStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      // Modo privado o almacenamiento bloqueado: la sesion vive solo en memoria.
    }
  }

  private limpiarYSalir(): void {
    this.limpiarSesion();
    void this.router.navigate(['/login']);
  }
}

function leerTokenGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

/** Decodifica el payload de un JWT. Devuelve null si no es legible. */
function decodificarJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(relleno)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}
