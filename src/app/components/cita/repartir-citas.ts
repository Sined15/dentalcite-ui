import { CitaResumen } from '../../models';


export interface RepartoCitas {
  futuras: CitaResumen[];
  pasadas: CitaResumen[];
}

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
  futuras.reverse();
  return { futuras, pasadas };
}

export function instanteLocal(fecha: string, hora: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, hh, mm).getTime();
}

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
