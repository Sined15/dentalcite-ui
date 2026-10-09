export interface Especialidad {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  imagenUrl: string | null;
}

export interface EspecialidadRequest {
  nombre: string;
  descripcion?: string;
}
