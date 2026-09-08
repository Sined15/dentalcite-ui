import { Rol, TipoDocumento } from './comun.model';

/** Respuesta de `UsuarioResponseDTO`. */
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  requiereCambioPassword: boolean;
  tokensValidosDesde: string;
  fichaId: string | null;
  /**
   * Solo llega en la respuesta del alta, y solo si el administrador no indico
   * Contraseña. Es el unico instante en que existe fuera del hash: se muestra
   * una vez y no se guarda en el cliente.
   */
  passwordProvisional?: string;
}

/**
 * Cuerpo de `UsuarioRequestDTO` (alta). `tipoDocumento` y `documento` son
 * obligatorios cuando el rol es ODONTOLOGO: lo exige el servicio, no Bean
 * Validation, asi que omitirlos devuelve 400.
 */
export interface UsuarioRequest {
  nombre: string;
  correo: string;
  rol: Rol;
  tipoDocumento?: TipoDocumento;
  documento?: string;
  passwordProvisional?: string;
}

/** Cuerpo de `UsuarioReplaceRequestDTO` (PUT). Los tres campos obligatorios. */
export interface UsuarioReplaceRequest {
  nombre: string;
  rol: Rol;
  activo: boolean;
}

/** Cuerpo de `UsuarioUpdateRequestDTO` (PATCH). Todo opcional. */
export interface UsuarioUpdateRequest {
  nombre?: string;
  rol?: Rol;
  activo?: boolean;
}

/** Cuerpo de `CambioPasswordRequestDTO`. */
export interface CambioPasswordRequest {
  passwordActual: string;
  nuevoPassword: string;
}

/** Cuerpo de `PasswordProvisionalRequestDTO`. */
export interface PasswordProvisionalRequest {
  password: string;
}
