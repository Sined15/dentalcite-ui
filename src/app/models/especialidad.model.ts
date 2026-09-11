/** Respuesta de `EspecialidadResponseDTO`. */
export interface Especialidad {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  /** RF-09 (v4): ruta de la imagen. Puede faltar; la vista pinta un marcador. */
  imagenUrl: string | null;
}

/** Cuerpo de `EspecialidadRequestDTO`, para POST y PUT. */
export interface EspecialidadRequest {
  nombre: string;
  descripcion?: string;
}
