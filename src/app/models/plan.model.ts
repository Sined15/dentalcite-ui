export interface PlanReferencia {
  id: string;
  nombre: string;
}

export const ESTADOS_SESION = ['PENDIENTE', 'ATENDIDA', 'CERRADA'] as const;
export type EstadoSesion = (typeof ESTADOS_SESION)[number];

export interface SesionCita {
  id: string;
  codigo: string;
  inicio: string;
}

export interface Recomendacion {
  id: string;
  descripcion: string;
}

export interface PlanSesion {
  id: string;
  numero: number;
  estado: EstadoSesion;
  cita: SesionCita | null;
  recomendaciones: Recomendacion[];
  proximoControl: string | null;
  observacion: string | null;
}

export interface PlanAvance {
  completadas: number;
  pendientes: number;
}

export interface Plan {
  id: string;
  paciente: PlanReferencia;
  tratamiento: PlanReferencia;
  odontologo: PlanReferencia;
  sesionesPrevistas: number;
  activo: boolean;
  motivoSuspension: string | null;
  creadoEn: string;
  avance: PlanAvance;
  sesiones: PlanSesion[];
}

export function sesionesPorCerrar(plan: Plan): number {
  return plan.sesiones.filter((s) => s.estado === 'ATENDIDA').length;
}

export interface PlanRequest {
  pacienteId: string;
  tratamientoId: string;
  odontologoId?: string;
  sesionesPrevistas: number;
}

export interface SuspensionRequest {
  motivo: string;
}

export interface CierreSesionRequest {
  recomendacionIds: string[];
  proximoControl: string;
  observacion?: string;
}
