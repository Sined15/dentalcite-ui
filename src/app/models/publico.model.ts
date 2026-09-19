/**
 * El catalogo tal como lo devuelve `/api/v1/publico/...`, que no es el mismo
 * cuerpo que ven las pantallas de mantenimiento: aqui no hay `activo`, ni
 * `fichaId`, ni la descripcion de la especialidad. Son tipos propios a proposito,
 * para que un componente publico no pueda pintar por descuido un dato que la API
 * publica no manda.
 */

/**
 * Respuesta de `CalendarioPublicoDTO`: que dias abre la clinica.
 *
 * `diasDeAtencion` va de 1 (lunes) a 7 (domingo), como lo guarda el horario. Es
 * la union de lo que declara cada odontologo: el dia que no declara nadie es el
 * dia en que la clinica cierra.
 */
export interface CalendarioPublico {
  diasDeAtencion: number[];
  /** "YYYY-MM-DD". Dias sin atencion aunque caigan en dia laborable. */
  feriados: string[];
  porOdontologo: DiasDeOdontologo[];
}

export interface DiasDeOdontologo {
  odontologoId: string;
  dias: number[];
}

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
  /**
   * Las mismas, por identificador: la consulta de franjas filtra por el de la
   * especialidad del tratamiento, y el nombre lo puede reescribir el administrador.
   */
  especialidadIds: string[];
}

/** Respuesta de `EspecialidadDetalleDTO`. */
export interface EspecialidadDetalle {
  id: string;
  nombre: string;
  imagenUrl: string | null;
  tratamientos: TratamientoPublico[];
  odontologos: OdontologoPublico[];
}
