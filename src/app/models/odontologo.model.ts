import { Especialidad } from './especialidad.model';

/** Respuesta de `OdontologoResponseDTO`. */
export interface Odontologo {
  id: string;
  cop: string;
  nombres: string;
  apellidos: string;
  fichaId: string;
  activo: boolean;
  especialidades: Especialidad[];
}

/**
 * Cuerpo de `OdontologoRequestDTO`. `fichaId` solo se obtiene del campo
 * homonimo de una cuenta con rol ODONTOLOGO (RN-11); en edicion no se puede
 * cambiar, el backend responde 409.
 */
export interface OdontologoRequest {
  cop: string;
  nombres: string;
  apellidos: string;
  fichaId: string;
  especialidadesIds: string[];
}
