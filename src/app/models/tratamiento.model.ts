import { Especialidad } from './especialidad.model';

/** Respuesta de `TratamientoResponseDTO`. La especialidad llega anidada. */
export interface Tratamiento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  duracionMinutos: number;
  especialidad: Especialidad;
  activo: boolean;
  /** RF-09 (v4): ruta de la imagen. Puede faltar; la vista pinta un marcador. */
  imagenUrl: string | null;
}

/**
 * Cuerpo de `TratamientoRequestDTO`. La asimetria con la respuesta es real:
 * al escribir se envia `especialidadId` plano, al leer llega `especialidad`.
 */
export interface TratamientoRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  duracionMinutos: number;
  especialidadId: string;
  imagenUrl?: string;
}

/** RN-04: multiplo de 15 minutos, entre 15 y 240. */
export const DURACION_MIN = 15;
export const DURACION_MAX = 240;
export const DURACION_PASO = 15;
