import { EstadoCita } from '../models';

/** Etiqueta, tono e icono de una cita: el estado siempre va con palabra e icono. */
export function etiquetaDeEstadoCita(estado: EstadoCita): string {
  return estado === 'NO_ASISTIO' ? 'No asistió' : estado.charAt(0) + estado.slice(1).toLowerCase();
}

export function tonoDeEstadoCita(estado: EstadoCita): 'info' | 'ok' | 'aviso' | 'error' {
  switch (estado) {
    case 'CONFIRMADA':
      return 'info';
    case 'ATENDIDA':
      return 'ok';
    case 'NO_ASISTIO':
      return 'aviso';
    default:
      return 'error';
  }
}

export function iconoDeEstadoCita(estado: EstadoCita): string {
  switch (estado) {
    case 'CONFIRMADA':
      return 'schedule';
    case 'ATENDIDA':
      return 'check_circle';
    case 'NO_ASISTIO':
      return 'warning';
    default:
      return 'cancel';
  }
}
