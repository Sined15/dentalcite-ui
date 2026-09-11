/**
 * El catalogo tal como lo devuelve `/api/v1/publico/...`, que no es el mismo
 * cuerpo que ven las pantallas de mantenimiento: aqui no hay `activo`, ni
 * `fichaId`, ni la descripcion de la especialidad. Son tipos propios a proposito,
 * para que un componente publico no pueda pintar por descuido un dato que la API
 * publica no manda.
 */

/** Respuesta de `EspecialidadPublicaDTO`: imagen y nombre, nada mas. */
export interface EspecialidadPublica {
  id: string;
  nombre: string;
  imagenUrl: string | null;
}

/** Respuesta de `TratamientoPublicoDTO`. */
export interface TratamientoPublico {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracionMinutos: number;
  imagenUrl: string | null;
  especialidadId: string;
  especialidadNombre: string;
}

/** Respuesta de `OdontologoPublicoDTO`: la ficha que RF-10 (v4) enumera. */
export interface OdontologoPublico {
  id: string;
  nombres: string;
  apellidos: string;
  cop: string;
  imagenUrl: string | null;
  especialidades: string[];
}

/** Respuesta de `EspecialidadDetalleDTO`. */
export interface EspecialidadDetalle {
  id: string;
  nombre: string;
  imagenUrl: string | null;
  tratamientos: TratamientoPublico[];
  odontologos: OdontologoPublico[];
}
