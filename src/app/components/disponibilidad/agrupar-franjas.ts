import { DisponibilidadResponse, PASO_AGRUPACION_MINUTOS } from '../../models';

/** Un odontologo dentro de un bloque, con los inicios exactos que ofrece en el. */
export interface OdontologoDeBloque {
  id: string;
  nombre: string;
  inicios: string[];
}

/** Un bloque de la jornada: la etiqueta que se muestra y lo que hay debajo. */
export interface BloqueAgrupado {
  /** Comienzo del bloque, "HH:mm". Es lo que ve el usuario. */
  inicio: string;
  /** Los inicios exactos que caen dentro, "HH:mm". Nunca se pierde ninguno. */
  inicios: string[];
  odontologos: OdontologoDeBloque[];
}

export interface DiaAgrupado {
  /** "YYYY-MM-DD". */
  fecha: string;
  bloques: BloqueAgrupado[];
}

/**
 * Reagrupa la respuesta del motor para el portal (HU-08, RN-04).
 *
 * El servidor responde por odontologo y con la granularidad fina del motor,
 * quince minutos. El paciente no piensa asi: piensa «¿que dia puedo ir?». Esta
 * funcion invierte el eje —dia primero— y colapsa los inicios en bloques del
 * paso pedido, que es el criterio de aceptacion del cliente: «la interfaz las
 * agrupara en pasos de treinta minutos para no fragmentar la eleccion».
 *
 * Agrupar no es descartar: cada bloque conserva en `inicios` los comienzos
 * exactos que contiene, de modo que la reserva (HU-09) tendra el minuto real y
 * la vista de quince minutos es el mismo calculo con otro paso.
 *
 * Un dia se ofrece si algun odontologo lo ofrece; los odontologos de un bloque
 * son los que tienen hueco en el.
 */
export function agruparFranjas(
  respuesta: DisponibilidadResponse | null,
  pasoMinutos: number = PASO_AGRUPACION_MINUTOS,
): DiaAgrupado[] {
  if (!respuesta || pasoMinutos <= 0) {
    return [];
  }

  // fecha -> minuto del bloque -> acumulado. Los Set evitan que dos odontologos
  // con el mismo hueco lo dupliquen en la lista del bloque.
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

/** "09:15:00" -> 555. `null` si la cadena no es una hora reconocible. */
function aMinutos(hora: string): number | null {
  const partes = /^(\d{1,2}):(\d{2})/.exec(hora);
  if (!partes) {
    return null;
  }
  return Number(partes[1]) * 60 + Number(partes[2]);
}

/** "09:15:00" -> "09:15". Los segundos siempre son cero y solo estorban. */
function aHoraCorta(hora: string): string {
  return hora.slice(0, 5);
}

/** 555 -> "09:15". */
function deMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
