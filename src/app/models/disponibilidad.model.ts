export interface DisponibilidadResponse {
  tratamientoId: string;
  duracionMinutos: number;
  desde: string;
  hasta: string;
  zonaHoraria: string;
  odontologos: AgendaOdontologo[];
}

export interface AgendaOdontologo {
  id: string;
  nombres: string;
  apellidos: string;
  dias: DiaDisponible[];
}

export interface DiaDisponible {
  fecha: string;
  inicios: string[];
}

export interface DisponibilidadQuery {
  tratamientoId: string;
  odontologoId?: string;
  desde: string;
  hasta: string;
}

export const DIAS_MAXIMOS = 14;

export const PASO_AGRUPACION_MINUTOS = 30;
