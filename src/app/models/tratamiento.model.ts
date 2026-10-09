import { Especialidad } from './especialidad.model';

export interface Tratamiento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  duracionMinutos: number;
  especialidad: Especialidad;
  activo: boolean;
  imagenUrl: string | null;
}

export interface TratamientoRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  duracionMinutos: number;
  especialidadId: string;
  imagenUrl?: string;
}

export const DURACION_MIN = 15;
export const DURACION_MAX = 240;
export const DURACION_PASO = 15;
