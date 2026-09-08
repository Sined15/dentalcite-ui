import { Rol, TipoDocumento } from './comun.model';

/** Cuerpo de `LoginRequest`. */
export interface LoginRequest {
  correo: string;
  password: string;
}

/** Respuesta de `TokenResponse`. El JWT viaja desnudo, sin prefijo Bearer. */
export interface TokenResponse {
  token: string;
}

/** Cuerpo de `RegistroRequest`. El consentimiento debe ser `true` (RNF-06). */
export interface RegistroRequest {
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  correo: string;
  telefono?: string;
  password: string;
  consentimientoAceptado: boolean;
  versionConsentimiento: string;
}

/**
 * Claims utiles del JWT que emite `JwtService`. Se decodifican en cliente solo
 * para decidir navegacion: la autoridad es siempre el backend.
 */
export interface JwtClaims {
  sub: string;
  rol: Rol;
  requiere_cambio_password: boolean;
  exp: number;
  iat: number;
  iss: string;
}
