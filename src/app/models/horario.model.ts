/**
 * Respuesta de `HorarioResponseDTO`.
 *
 * `horaInicio` y `horaFin` son `LocalTime`: cadenas "HH:mm:ss" sin fecha ni
 * zona. No convertirlas a `Date`.
 */
export interface Horario {
  id: string;
  odontologoId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

/** Cuerpo de `HorarioRequest`. `diaSemana` de 1 (lunes) a 7 (domingo). */
export interface HorarioRequest {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}
