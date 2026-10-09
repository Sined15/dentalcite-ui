export interface Bloqueo {
  id: string;
  odontologoId: string | null;
  odontologo: string | null;
  consultorioId: string | null;
  consultorio: string | null;
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface BloqueoRequest {
  odontologoId?: string;
  consultorioId?: string;
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
}
