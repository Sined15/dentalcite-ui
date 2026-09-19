import { CalendarioPublico } from '../models';

/**
 * Traduce «qué días abre la clínica» a lo que un calendario entiende.
 *
 * Vive aquí y no dentro de una pantalla porque lo usan tres calendarios con dos
 * intenciones distintas: el de reservar **impide** marcar un día cerrado, y los
 * de consultar la agenda o registrar un bloqueo solo lo **atenúan**, porque ahí
 * el día es el extremo de un rango y una ausencia legítima puede empezar el
 * viernes y acabar el lunes. Tenerlo dos veces sería tener dos criterios de qué
 * es un día cerrado.
 *
 * El día de la semana se cuenta de 1 (lunes) a 7 (domingo), como lo guarda el
 * horario. `getDay()` no sirve tal cual: para JavaScript el domingo es 0.
 */

/** 1 = lunes … 7 = domingo, a partir del 0 = domingo de `Date`. */
export function diaDeLaSemana(fecha: Date): number {
  const dia = fecha.getDay();
  return dia === 0 ? 7 : dia;
}

/** La fecha en "YYYY-MM-DD" local, que es como viajan los feriados. */
function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Si ese día se atiende.
 *
 * @param calendario lo que devolvió la API, o `null` mientras no haya llegado.
 * @param odontologoId para estrechar el calendario a los días de una persona;
 *   sin él valen los de la clínica, que son la unión de todos.
 *
 * **Mientras el calendario no ha llegado, todo día se considera abierto.** Es
 * deliberado: una consulta lenta o caída no puede dejar el calendario entero en
 * gris, que se leería como «la clínica no abre nunca». Quien reserve un día que
 * no toca recibirá una lista de franjas vacía, que es el comportamiento de antes.
 */
export function seAtiende(
  calendario: CalendarioPublico | null,
  fecha: Date,
  odontologoId?: string | null,
): boolean {
  if (!calendario) {
    return true;
  }
  if (calendario.feriados.includes(aIso(fecha))) {
    return false;
  }
  const propios = odontologoId
    ? calendario.porOdontologo.find((o) => o.odontologoId === odontologoId)?.dias
    : undefined;
  const dias = propios ?? calendario.diasDeAtencion;
  return dias.includes(diaDeLaSemana(fecha));
}

/**
 * El predicado que espera `matDatepickerFilter`, que recibe `null` cuando el
 * campo está vacío y espera `true` para no deshabilitar nada.
 */
export function filtroDeDias(
  calendario: CalendarioPublico | null,
  odontologoId?: string | null,
): (fecha: Date | null) => boolean {
  return (fecha) => (fecha ? seAtiende(calendario, fecha, odontologoId) : true);
}

/**
 * La clase CSS que marca un día cerrado **sin impedir elegirlo**, para los
 * calendarios de rango.
 *
 * Solo pinta en la vista de mes: en la de años la celda es un año entero y
 * teñirla no querría decir nada. La regla `.dia-cerrado` vive en los estilos
 * globales y no en el componente, porque el calendario se dibuja en una capa
 * aparte y la encapsulación del componente no lo alcanza.
 */
export function claseDeDias(
  calendario: CalendarioPublico | null,
  odontologoId?: string | null,
): (fecha: Date, vista: 'month' | 'year' | 'multi-year') => string {
  return (fecha, vista) =>
    vista === 'month' && !seAtiende(calendario, fecha, odontologoId) ? 'dia-cerrado' : '';
}
