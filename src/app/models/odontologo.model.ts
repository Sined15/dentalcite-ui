import { Especialidad } from './especialidad.model';

export interface Odontologo {
  id: string;
  cop: string;
  nombres: string;
  apellidos: string;
  fichaId: string;
  activo: boolean;
  imagenUrl: string | null;
  especialidades: Especialidad[];
}

export interface OdontologoRequest {
  cop: string;
  nombres: string;
  apellidos: string;
  fichaId: string;
  especialidadesIds: string[];
  imagenUrl?: string;
}
