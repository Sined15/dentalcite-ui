import { Rol, TipoDocumento } from './comun.model';

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface TokenResponse {
  token: string;
}

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

export interface JwtClaims {
  sub: string;
  rol: Rol;
  requiere_cambio_password: boolean;
  exp: number;
  iat: number;
  iss: string;
}
