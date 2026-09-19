/** Referencia reducida a un recurso, como en `cita.model.ts`. */
export interface PlanReferencia {
  id: string;
  nombre: string;
}

/** RN-15: los tres estados que recorre una sesion. */
export const ESTADOS_SESION = ['PENDIENTE', 'ATENDIDA', 'CERRADA'] as const;
export type EstadoSesion = (typeof ESTADOS_SESION)[number];

/** La cita atendida que ocupa una sesion. */
export interface SesionCita {
  id: string;
  codigo: string;
  /** Instante ISO con desfase, como `creadoEn`. */
  inicio: string;
}

/**
 * Un cuidado del catalogo cerrado.
 *
 * El catalogo no se mantiene por interfaz: se elige de el al cerrar una sesion, y
 * lo que el odontologo quiera anadir con sus palabras va en la observacion.
 */
export interface Recomendacion {
  id: string;
  descripcion: string;
}

/** Una sesion del plan, numerada desde 1 (HU-17 · RN-15). */
export interface PlanSesion {
  id: string;
  numero: number;
  estado: EstadoSesion;
  /** La cita que la ocupa; `null` mientras sigue pendiente. */
  cita: SesionCita | null;
  /** Los cuidados indicados al cerrarla. Vacia mientras no se ha cerrado, nunca ausente. */
  recomendaciones: Recomendacion[];
  /** Fecha sugerida del proximo control (`YYYY-MM-DD`); `null` hasta que se cierra. */
  proximoControl: string | null;
  /** La observacion de cuidado, si se escribio. No es una indicacion clinica. */
  observacion: string | null;
}

/**
 * Un plan de tratamiento (HU-17 · RF-23).
 *
 * **No lleva el avance como cifra.** Se cuenta sobre las sesiones, que traen la
 * cita que las ocupa, y un campo que lo resumiera seria otro dato que mantener
 * de acuerdo con ellas.
 */
export interface Plan {
  id: string;
  paciente: PlanReferencia;
  tratamiento: PlanReferencia;
  odontologo: PlanReferencia;
  sesionesPrevistas: number;
  /** RN-12: la baja logica. Falso desde que se suspende. */
  activo: boolean;
  /** Solo en los suspendidos. */
  motivoSuspension: string | null;
  /** Instante ISO con desfase. */
  creadoEn: string;
  sesiones: PlanSesion[];
}

/**
 * Cuerpo de `POST /api/v1/planes`.
 *
 * `odontologoId` va al reves segun el rol, como `pacienteId` en la reserva: el
 * ODONTOLOGO tiene que omitirlo —sale de su token y mandarlo da 403— y el
 * ADMINISTRADOR tiene que incluirlo, porque su cuenta no planifica por si sola.
 */
export interface PlanRequest {
  pacienteId: string;
  tratamientoId: string;
  odontologoId?: string;
  sesionesPrevistas: number;
}

/** Cuerpo de `PATCH /api/v1/planes/{id}/suspender`. El motivo es obligatorio. */
export interface SuspensionRequest {
  motivo: string;
}

/**
 * Cuerpo de `POST /api/v1/planes/{id}/sesiones/{numero}/cierre`.
 *
 * Al menos una recomendacion —una lista vacia da 400— y la fecha del proximo
 * control, que no puede ser anterior a hoy. La observacion es opcional y la
 * interfaz advierte que son cuidados, no una indicacion clinica.
 */
export interface CierreSesionRequest {
  recomendacionIds: string[];
  /** `YYYY-MM-DD`, en la zona de la clinica. */
  proximoControl: string;
  observacion?: string;
}
