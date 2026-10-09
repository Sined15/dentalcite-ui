import { CitaResumen } from './cita.model';
import { TipoDocumento } from './comun.model';

export interface Paciente {
  id: string;
  numeroHistoria: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  tieneCuenta: boolean;
}

export interface PacienteDetalle extends Paciente {
  alergias: string | null;
  citas: CitaResumen[];
}

export interface PacienteUpdateRequest {
  nombres: string;
  apellidos: string;
  telefono?: string;
  alergias?: string;
}

export interface PacienteRequest {
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  telefono?: string;
  consentimientoAceptado: boolean;
  versionConsentimiento: string;
}
