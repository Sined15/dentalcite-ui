/** Referencia reducida a un recurso, como en `cita.model.ts`. */
export interface PlanReferencia {
  id: string;
  nombre: string;
}

/** RN-15: los tres estados que recorre una sesion. */
export const ESTADOS_SESION = ['PENDIENTE', 'ATENDIDA', 'CERRADA'] as const;
export type EstadoSesion = (typeof ESTADOS_SESION)[number];

/** Una sesion del plan, numerada desde 1 (HU-17 · RN-15). */
export interface PlanSesion {
  id: string;
  numero: number;
  estado: EstadoSesion;
}

/**
 * Un plan de tratamiento (HU-17 · RF-23).
 *
 * **No lleva avance.** RN-14 lo deriva de las citas atendidas enlazadas al plan y
 * eso es HU-18: en este Sprint todas las sesiones nacen PENDIENTE y no hay nada
 * que contar.
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
