import { DisponibilidadResponse, PASO_AGRUPACION_MINUTOS } from '../../models';

export interface OdontologoDeBloque {
  id: string;
  nombre: string;
  inicios: string[];
}

export interface BloqueAgrupado {
  inicio: string;
  inicios: string[];
  odontologos: OdontologoDeBloque[];
}

export interface DiaAgrupado {
  fecha: string;
  bloques: BloqueAgrupado[];
}

export function agruparFranjas(
  respuesta: DisponibilidadResponse | null,
  pasoMinutos: number = PASO_AGRUPACION_MINUTOS,
): DiaAgrupado[] {
  if (!respuesta || pasoMinutos <= 0) {
    return [];
  }

  const porDia = new Map<string, Map<number, Acumulado>>();

  for (const agenda of respuesta.odontologos) {
    const nombre = `${agenda.nombres} ${agenda.apellidos}`.trim();

    for (const dia of agenda.dias) {
      let bloques = porDia.get(dia.fecha);
      if (!bloques) {
        bloques = new Map<number, Acumulado>();
        porDia.set(dia.fecha, bloques);
      }

      for (const inicio of dia.inicios) {
        const minutos = aMinutos(inicio);
        if (minutos === null) {
          continue;
        }
        const bloque = Math.floor(minutos / pasoMinutos) * pasoMinutos;

        let acumulado = bloques.get(bloque);
        if (!acumulado) {
          acumulado = { inicios: new Set<string>(), odontologos: new Map<string, AcumuladoOdo>() };
          bloques.set(bloque, acumulado);
        }

        const hora = aHoraCorta(inicio);
        acumulado.inicios.add(hora);

        let odo = acumulado.odontologos.get(agenda.id);
        if (!odo) {
          odo = { nombre, inicios: new Set<string>() };
          acumulado.odontologos.set(agenda.id, odo);
        }
        odo.inicios.add(hora);
      }
    }
  }

  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, bloques]) => ({
      fecha,
      bloques: [...bloques.entries()]
        .sort(([a], [b]) => a - b)
        .map(([minuto, acumulado]) => ({
          inicio: deMinutos(minuto),
          inicios: [...acumulado.inicios].sort((a, b) => a.localeCompare(b)),
          odontologos: [...acumulado.odontologos.entries()]
            .map(([id, odo]) => ({
              id,
              nombre: odo.nombre,
              inicios: [...odo.inicios].sort((a, b) => a.localeCompare(b)),
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        })),
    }))
    .filter((dia) => dia.bloques.length > 0);
}

interface AcumuladoOdo {
  nombre: string;
  inicios: Set<string>;
}

interface Acumulado {
  inicios: Set<string>;
  odontologos: Map<string, AcumuladoOdo>;
}

function aMinutos(hora: string): number | null {
  const partes = /^(\d{1,2}):(\d{2})/.exec(hora);
  if (!partes) {
    return null;
  }
  return Number(partes[1]) * 60 + Number(partes[2]);
}

function aHoraCorta(hora: string): string {
  return hora.slice(0, 5);
}

function deMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
