import { CitaResumen } from '../../models';
import { instanteLocal } from './repartir-citas';

export interface TratamientoRecibido {
  tratamientoId: string;
  nombre: string;
  sesiones: number;
  ultimaFecha: string;
  ultimoOdontologo: string;
}

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
