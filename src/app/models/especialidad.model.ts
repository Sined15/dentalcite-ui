/** Respuesta de `EspecialidadResponseDTO`. */
export interface Especialidad {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

/** Cuerpo de `EspecialidadRequestDTO`, para POST y PUT. */
export interface EspecialidadRequest {
  nombre: string;
  descripcion?: string;
}
