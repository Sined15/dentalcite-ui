/**
 * Color e icono de cada especialidad, fijos en toda la aplicación: el par es
 * lo que permite reconocer una tarjeta antes de leerla. El color vive en el
 * recuadro del icono y en el rótulo, nunca como fondo de la tarjeta.
 *
 * La API pública solo manda el nombre, así que la clave se deduce de él; una
 * especialidad desconocida queda sin `data-spec` y cae al neutro de
 * `styles.scss`, que sigue siendo legible.
 */
export interface EspecialidadVisual {
  /** Valor del atributo `data-spec`, o `null` si la especialidad no es conocida. */
  clave: string | null;
  /** Nombre de un icono de Material Icons. */
  icono: string;
}

const ESPECIALIDADES: readonly { patron: RegExp; visual: EspecialidadVisual }[] = [
  { patron: /estetic/, visual: { clave: 'estetica', icono: 'auto_awesome' } },
  { patron: /ortodoncia/, visual: { clave: 'ortodoncia', icono: 'straighten' } },
  { patron: /rehabilit/, visual: { clave: 'rehabilitacion', icono: 'workspace_premium' } },
  { patron: /periodoncia/, visual: { clave: 'periodoncia', icono: 'spa' } },
  { patron: /endodoncia/, visual: { clave: 'endodoncia', icono: 'healing' } },
  { patron: /cirugia/, visual: { clave: 'cirugia', icono: 'content_cut' } },
  { patron: /general/, visual: { clave: 'general', icono: 'medical_services' } },
];

const NEUTRO: EspecialidadVisual = { clave: null, icono: 'medical_services' };

function sinTildes(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function visualDeEspecialidad(nombre: string | null | undefined): EspecialidadVisual {
  if (!nombre) {
    return NEUTRO;
  }
  const plano = sinTildes(nombre);
  return ESPECIALIDADES.find((e) => e.patron.test(plano))?.visual ?? NEUTRO;
}
