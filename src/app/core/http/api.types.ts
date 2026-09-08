/**
 * Tipos compartidos de la frontera HTTP.
 *
 * La API no envuelve sus respuestas: cada endpoint devuelve su DTO, o un
 * `Page<T>` de Spring Data cuando es paginado.
 */

/** Forma serializada de `org.springframework.data.domain.Page<T>`. */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

/** Cuerpo `{message}` de `common/api/dto/MessageResponse.java`. */
export interface MessageResponse {
  message: string;
}

/**
 * Cuerpo del 400 de validación. `GlobalExceptionHandler` devuelve un mapa
 * campo → mensaje, no un `{message}`: es la excepción a la forma habitual.
 */
export type ValidationErrors = Record<string, string>;

/** Cita alcanzada por un bloqueo (RN-03). Solo aparece dentro del 409. */
export interface CitaAfectada {
  id: string;
  codigo: string;
  inicio: string;
  fin: string;
  paciente: string;
  numeroHistoria: string;
}

/** Cuerpo del 409 con el que se rechaza un bloqueo que alcanza citas activas. */
export interface BloqueoConflicto {
  message: string;
  citasActivas: CitaAfectada[];
}

/** Parámetros de paginación que aceptan los cuatro endpoints paginados. */
export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string;
}
