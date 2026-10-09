export interface Horario {
  id: string;
  odontologoId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface HorarioRequest {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}
