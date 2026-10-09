export interface CalendarioPublico {
  diasDeAtencion: number[];
  feriados: string[];
  porOdontologo: DiasDeOdontologo[];
}

export interface DiasDeOdontologo {
  odontologoId: string;
  dias: number[];
}

export interface EspecialidadPublica {
  id: string;
  nombre: string;
  imagenUrl: string | null;
}

export interface TratamientoPublico {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracionMinutos: number;
  imagenUrl: string | null;
  especialidadId: string;
  especialidadNombre: string;
}

export interface OdontologoPublico {
  id: string;
  nombres: string;
  apellidos: string;
  cop: string;
  imagenUrl: string | null;
  especialidades: string[];
  especialidadIds: string[];
}

export interface EspecialidadDetalle {
  id: string;
  nombre: string;
  imagenUrl: string | null;
  tratamientos: TratamientoPublico[];
  odontologos: OdontologoPublico[];
}
