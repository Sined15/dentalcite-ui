/**
 * Respuesta de `DisponibilidadResponseDTO` (HU-08 · RF-13, RF-14).
 *
 * La agrupacion es por odontologo y no por franja: es la forma mas compacta para
 * un rango de catorce dias, y el portal arma «cualquier odontologo» uniendo las
 * listas.
 *
 * Las horas de `inicios` son `LocalTime`: cadenas "HH:mm:ss" sin fecha ni zona,
 * ancladas por `zonaHoraria`. **No convertirlas a `Date`**: el navegador les
 * aplicaria la zona del equipo, y un paciente que consultase desde otro huso
 * veria las franjas movidas. `fecha` es "YYYY-MM-DD" por el mismo motivo.
 *
 * El fin de cada franja es `inicio + duracionMinutos`; no viaja repetido.
 */
export interface DisponibilidadResponse {
  tratamientoId: string;
  duracionMinutos: number;
  desde: string;
  hasta: string;
  zonaHoraria: string;
  odontologos: AgendaOdontologo[];
}

/** Los dias con franjas de un odontologo. Sin ninguno, no aparece en la lista. */
export interface AgendaOdontologo {
  id: string;
  nombres: string;
  apellidos: string;
  dias: DiaDisponible[];
}

export interface DiaDisponible {
  /** "YYYY-MM-DD". */
  fecha: string;
  /** "HH:mm:ss", hora local de la clinica. */
  inicios: string[];
}

/** Parametros de `GET /api/v1/disponibilidad`. Omitir `odontologoId` = cualquiera. */
export interface DisponibilidadQuery {
  tratamientoId: string;
  odontologoId?: string;
  desde: string;
  hasta: string;
}

/**
 * RNF-01 acota el rango consultable a catorce dias. El servidor es la autoridad
 * —responde 400 si se supera—; validarlo aqui solo evita el viaje.
 */
export const DIAS_MAXIMOS = 14;

/**
 * RN-04, criterio de aceptacion del portal: «la interfaz las agrupara en pasos
 * de treinta minutos para no fragmentar la eleccion». La granularidad fina la
 * calcula el servidor; reducirla a algo elegible es trabajo del cliente.
 */
export const PASO_AGRUPACION_MINUTOS = 30;
