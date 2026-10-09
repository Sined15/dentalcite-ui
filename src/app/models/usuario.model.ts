import { Rol, TipoDocumento } from './comun.model';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  requiereCambioPassword: boolean;
  tokensValidosDesde: string;
  fichaId: string | null;
  passwordProvisional?: string;
}

export interface UsuarioRequest {
  nombre: string;
  correo: string;
  rol: Rol;
  tipoDocumento?: TipoDocumento;
  documento?: string;
  passwordProvisional?: string;
}

export interface UsuarioReplaceRequest {
  nombre: string;
  rol: Rol;
  activo: boolean;
}

export interface UsuarioUpdateRequest {
  nombre?: string;
  rol?: Rol;
  activo?: boolean;
}

export interface CambioPasswordRequest {
  passwordActual: string;
  nuevoPassword: string;
}

export interface PasswordProvisionalRequest {
  password: string;
}
