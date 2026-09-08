/**
 * Respuesta de `BloqueoResponseDTO`. El backend ya resuelve los nombres de
 * odontologo y consultorio, asi que la tabla no necesita cruzarlos.
 *
 * `fechaInicio` y `fechaFin` son `OffsetDateTime`: ISO-8601 con desfase, a
 * diferencia de las `LocalTime` de horario.
 */
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

/**
 * Cuerpo de `BloqueoRequest`. Hay que indicar exactamente uno de
 * `odontologoId` o `consultorioId`: Bean Validation no lo comprueba, lo hace
 * el servicio y devuelve 400.
 */
export interface BloqueoRequest {
  odontologoId?: string;
  consultorioId?: string;
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
}
