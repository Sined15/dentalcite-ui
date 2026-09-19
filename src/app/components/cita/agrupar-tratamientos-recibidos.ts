import { CitaResumen } from '../../models';
import { instanteLocal } from './repartir-citas';

/**
 * Los tratamientos que un paciente ha recibido, deducidos de sus citas
 * atendidas.
 *
 * **Es una derivación, no un dato.** La API no tiene ningún endpoint de
 * «tratamientos recibidos», así que una sesión es una cita atendida y un
 * tratamiento recibido es el conjunto de las que comparten tratamiento. Los
 * planes sí traen su avance del servidor, y la pantalla lo lee de ahí; esto sigue
 * deduciéndose porque no todo lo que se atiende tiene plan, y una limpieza suelta
 * también es un tratamiento que el paciente ha recibido.
 *
 * De la cita solo viajan `{id, nombre}` del tratamiento —ni especialidad ni
 * duración—, y por eso no aparecen aquí: no se enseña lo que no se tiene.
 */
export interface TratamientoRecibido {
  tratamientoId: string;
  nombre: string;
  /** Citas atendidas de ese tratamiento. */
  sesiones: number;
  /** Fecha de la última sesión, tal como llega del servidor ("YYYY-MM-DD"). */
  ultimaFecha: string;
  /** Quién atendió esa última sesión. */
  ultimoOdontologo: string;
}

/**
 * El filtro por estado se repite aquí aunque el llamante ya lo pida al servidor.
 * No es desconfianza: es que la función tiene que ser correcta por sí sola, o su
 * resultado dependería de cómo la llamen.
 */
export function agruparTratamientosRecibidos(
  citas: readonly CitaResumen[],
): TratamientoRecibido[] {
  const porTratamiento = new Map<string, { fila: TratamientoRecibido; instante: number }>();

  for (const cita of citas) {
    if (cita.estado !== 'ATENDIDA') {
      continue;
    }
    const instante = instanteLocal(cita.fecha, cita.hora);
    const acumulado = porTratamiento.get(cita.tratamiento.id);

    if (!acumulado) {
      porTratamiento.set(cita.tratamiento.id, {
        instante,
        fila: {
          tratamientoId: cita.tratamiento.id,
          nombre: cita.tratamiento.nombre,
          sesiones: 1,
          ultimaFecha: cita.fecha,
          ultimoOdontologo: cita.odontologo.nombre,
        },
      });
      continue;
    }

    acumulado.fila.sesiones += 1;
    // «La última» es la más reciente de verdad, no la primera que llegue: el
    // orden de la respuesta es del servidor y esta función no debería depender
    // de él para dar la fecha correcta.
    if (instante > acumulado.instante) {
      acumulado.instante = instante;
      acumulado.fila.ultimaFecha = cita.fecha;
      acumulado.fila.ultimoOdontologo = cita.odontologo.nombre;
    }
  }

  return [...porTratamiento.values()]
    .sort((a, b) => b.instante - a.instante)
    .map((entrada) => entrada.fila);
}
