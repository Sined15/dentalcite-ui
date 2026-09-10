import { CitaResumen } from './cita.model';
import { TipoDocumento } from './comun.model';

/** Respuesta de `PacienteResponseDTO`. La entidad del servidor es `Ficha`. */
export interface Paciente {
  id: string;
  numeroHistoria: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  /** Si la persona tiene ademas cuenta de acceso. El alta presencial la crea sin ella. */
  tieneCuenta: boolean;
}

/**
 * Respuesta de `PacienteDetalleDTO` (HU-13 · RF-08): la ficha completa.
 *
 * Las citas vienen en una sola lista, de la mas reciente a la mas antigua;
 * agruparlas en pasadas y futuras es cosa de la pantalla. Cada fila repite el
 * paciente porque reutiliza el DTO de la agenda.
 */
export interface PacienteDetalle extends Paciente {
  alergias: string | null;
  citas: CitaResumen[];
}

/**
 * Cuerpo de `PUT /api/v1/pacientes/{id}`. Es un reemplazo total de lo editable:
 * omitir `telefono` lo borra, que es como se corrige uno equivocado.
 *
 * **No lleva documento**: RN-10 lo declara la identidad del paciente, y el
 * servidor no lo lee aunque se mande.
 */
export interface PacienteUpdateRequest {
  nombres: string;
  apellidos: string;
  telefono?: string;
  alergias?: string;
}

/**
 * Cuerpo de `PacienteRequestDTO` (alta presencial, HU-12). No lleva correo ni
 * contraseña a proposito: el criterio dice «sin credenciales de acceso», y
 * quien quiera cuenta se registra por el portal, que vincula esta misma ficha.
 */
export interface PacienteRequest {
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  telefono?: string;
  /** Debe ser `true`: el servidor lo exige con @AssertTrue y responde 400 (RNF-06). */
  consentimientoAceptado: boolean;
  versionConsentimiento: string;
}
