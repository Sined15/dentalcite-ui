import { CitaResumen } from '../../models';

/**
 * El reparto de las citas propias en las que están por venir y las que ya
 * pasaron, y la traducción de sus estados.
 *
 * Vive fuera de todo componente porque lo usan dos pantallas —«Mis citas», que
 * se queda con las próximas, e «Historial», que se queda con las pasadas— y
 * porque así la regla se prueba sin montar ninguna, igual que `agrupar-franjas`.
 *
 * El servidor no separa: `GET /api/v1/citas/mias` devuelve ambas en una sola
 * página ordenada de la más reciente a la más antigua, así que el corte es del
 * cliente.
 */

export interface RepartoCitas {
  futuras: CitaResumen[];
  pasadas: CitaResumen[];
}

/**
 * Futura es la que todavía no ha empezado.
 *
 * `ahora` es un parámetro y no una lectura directa del reloj para que la prueba
 * pueda situarse en un instante concreto sin tocar el tiempo global.
 */
export function repartirCitas(
  citas: readonly CitaResumen[],
  ahora: number = Date.now(),
): RepartoCitas {
  const futuras: CitaResumen[] = [];
  const pasadas: CitaResumen[] = [];

  for (const cita of citas) {
    if (instanteLocal(cita.fecha, cita.hora) >= ahora) {
      futuras.push(cita);
    } else {
      pasadas.push(cita);
    }
  }
  // Las próximas, de la más cercana a la más lejana: la de mañana primero. Las
  // pasadas se quedan como llegan —la más reciente delante—, que es el orden
  // que un historial quiere.
  futuras.reverse();
  return { futuras, pasadas };
}

/**
 * El instante local de una cita a partir de sus dos cadenas.
 *
 * Se construye la fecha componente a componente y no con `new Date(fecha)`:
 * esa forma interpretaría "2026-09-14" como medianoche UTC y desplazaría el día
 * entero al huso del navegador.
 */
export function instanteLocal(fecha: string, hora: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, hh, mm).getTime();
}

/** RN-09 en palabras, y en segunda persona: quien lo lee es el paciente. */
export function etiquetaEstado(estado: string): string {
  switch (estado) {
    case 'CONFIRMADA':
      return 'Confirmada';
    case 'ATENDIDA':
      return 'Atendida';
    case 'NO_ASISTIO':
      return 'No asististe';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return estado;
  }
}
