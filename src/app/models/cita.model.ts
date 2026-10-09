export interface CitaReferencia {
  id: string;
  nombre: string;
}

export interface Cita {
  id: string;
  codigo: string;
  fecha: string;
  hora: string;
  duracionMinutos: number;
  zonaHoraria: string;
  estado: string;
  tratamiento: CitaReferencia;
  odontologo: CitaReferencia;
  consultorio: CitaReferencia;
  sesionEnlazada?: SesionEnlazada;
}

export interface SesionEnlazada {
  planId: string;
  numero: number;
  tratamiento: string;
}

export interface CitaRequest {
  pacienteId?: string;
  tratamientoId: string;
  odontologoId: string;
  fecha: string;
  hora: string;
}

export const ESTADOS_CITA = ['CONFIRMADA', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA'] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];

export interface CitaPaciente {
  fichaId: string;
  nombre: string;
  numeroHistoria: string;
}

export interface CitaResumen {
  id: string;
  codigo: string;
  fecha: string;
  hora: string;
  duracionMinutos: number;
  zonaHoraria: string;
  estado: EstadoCita;
  motivoCancelacion: string | null;
  cancelablePorPaciente: boolean;
  paciente: CitaPaciente;
  odontologo: CitaReferencia;
  tratamiento: CitaReferencia;
  consultorio: CitaReferencia;
}

export interface CitaQuery {
  desde: string;
  hasta: string;
  odontologoId?: string;
  estado?: EstadoCita | '';
}

export interface MisCitasQuery {
  desde?: string;
  hasta?: string;
  estado?: EstadoCita | '';
}

export const RESULTADOS_CITA = ['ATENDIDA', 'NO_ASISTIO'] as const;
export type ResultadoCita = (typeof RESULTADOS_CITA)[number];

export interface ResultadoRequest {
  resultado: ResultadoCita;
}

export interface CancelacionRequest {
  motivo: string;
}

export interface CitaResponsable {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
}

export interface CitaHistorial {
  id: string;
  estadoAnterior: EstadoCita | null;
  estadoNuevo: EstadoCita;
  motivo: string | null;
  ocurridoEn: string;
  responsable: CitaResponsable | null;
}
