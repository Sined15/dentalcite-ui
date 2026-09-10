import { describe, expect, it } from 'vitest';
import { DisponibilidadResponse } from '../../models';
import { agruparFranjas } from './agrupar-franjas';

/**
 * Criterio de aceptación del portal en HU-08: «Dadas las franjas propuestas,
 * cuando se muestren en el portal, entonces la interfaz las agrupará en pasos de
 * treinta minutos para no fragmentar la elección» (RN-04).
 *
 * El motor propone cada quince minutos; agrupar es trabajo de esta capa, y estas
 * pruebas fijan que agrupar no pierde ninguna franja.
 */
function respuesta(odontologos: DisponibilidadResponse['odontologos']): DisponibilidadResponse {
  return {
    tratamientoId: 'tra-1',
    duracionMinutos: 30,
    desde: '2026-09-14',
    hasta: '2026-09-15',
    zonaHoraria: 'America/Lima',
    odontologos,
  };
}

const PEREZ = {
  id: 'odo-1',
  nombres: 'Juan',
  apellidos: 'Pérez',
  dias: [
    { fecha: '2026-09-14', inicios: ['09:00:00', '09:15:00', '09:30:00', '10:30:00'] },
    { fecha: '2026-09-15', inicios: ['11:00:00'] },
  ],
};

const RUIZ = {
  id: 'odo-2',
  nombres: 'Ana',
  apellidos: 'Ruiz',
  dias: [{ fecha: '2026-09-14', inicios: ['09:15:00', '14:45:00'] }],
};

describe('agruparFranjas', () => {
  it('colapsa los inicios de quince minutos en bloques de treinta', () => {
    const dias = agruparFranjas(respuesta([PEREZ]), 30);

    const lunes = dias[0];
    expect(lunes.fecha).toBe('2026-09-14');
    // 09:00 y 09:15 caen en el mismo bloque; 09:30 y 10:30 abren el suyo.
    expect(lunes.bloques.map((b) => b.inicio)).toEqual(['09:00', '09:30', '10:30']);
  });

  it('agrupar no descarta: cada bloque conserva los inicios exactos que contiene', () => {
    // Es lo que permitira a HU-09 reservar el minuto real y no el del bloque.
    const dias = agruparFranjas(respuesta([PEREZ]), 30);

    expect(dias[0].bloques[0].inicios).toEqual(['09:00', '09:15']);
    expect(dias[0].bloques[1].inicios).toEqual(['09:30']);
  });

  it('con paso de quince minutos devuelve la granularidad del motor', () => {
    const dias = agruparFranjas(respuesta([PEREZ]), 15);

    expect(dias[0].bloques.map((b) => b.inicio)).toEqual(['09:00', '09:15', '09:30', '10:30']);
  });

  it('invierte el eje: agrupa por día y no por odontólogo', () => {
    const dias = agruparFranjas(respuesta([PEREZ, RUIZ]), 30);

    expect(dias.map((d) => d.fecha)).toEqual(['2026-09-14', '2026-09-15']);
  });

  it('reúne en un mismo bloque a los odontólogos que lo ofrecen', () => {
    // «Cualquier odontólogo»: dos agendas distintas con hueco a la misma hora
    // son una sola franja para el paciente.
    const dias = agruparFranjas(respuesta([PEREZ, RUIZ]), 30);

    const nueve = dias[0].bloques.find((b) => b.inicio === '09:00');
    expect(nueve?.odontologos.map((o) => o.nombre)).toEqual(['Ana Ruiz', 'Juan Pérez']);
    // Perez ofrece 09:00 y 09:15; Ruiz solo 09:15.
    expect(nueve?.odontologos.find((o) => o.id === 'odo-2')?.inicios).toEqual(['09:15']);
    expect(nueve?.inicios).toEqual(['09:00', '09:15']);
  });

  it('ordena los días y, dentro de cada uno, los bloques', () => {
    const desordenado = respuesta([
      {
        id: 'odo-1',
        nombres: 'Juan',
        apellidos: 'Pérez',
        dias: [
          { fecha: '2026-09-15', inicios: ['09:00:00'] },
          { fecha: '2026-09-14', inicios: ['16:00:00', '08:00:00'] },
        ],
      },
    ]);

    const dias = agruparFranjas(desordenado, 30);

    expect(dias.map((d) => d.fecha)).toEqual(['2026-09-14', '2026-09-15']);
    expect(dias[0].bloques.map((b) => b.inicio)).toEqual(['08:00', '16:00']);
  });

  it('coloca un inicio a y media en el bloque de la media, no en el de la hora', () => {
    const dias = agruparFranjas(
      respuesta([
        {
          id: 'odo-1',
          nombres: 'Juan',
          apellidos: 'Pérez',
          dias: [{ fecha: '2026-09-14', inicios: ['14:45:00'] }],
        },
      ]),
      30,
    );

    expect(dias[0].bloques[0].inicio).toBe('14:30');
    expect(dias[0].bloques[0].inicios).toEqual(['14:45']);
  });

  it('sin respuesta o sin agenda devuelve una lista vacía', () => {
    expect(agruparFranjas(null, 30)).toEqual([]);
    expect(agruparFranjas(respuesta([]), 30)).toEqual([]);
  });

  it('un paso no positivo no rompe: devuelve vacío en vez de dividir por cero', () => {
    expect(agruparFranjas(respuesta([PEREZ]), 0)).toEqual([]);
  });
});
