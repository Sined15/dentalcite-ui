import { describe, expect, it } from 'vitest';
import { agruparTratamientosRecibidos } from './agrupar-tratamientos-recibidos';
import { cita } from './citas.testing';

const ENDODONCIA = { id: 'tra-1', nombre: 'Endodoncia unirradicular' };
const PROFILAXIS = { id: 'tra-2', nombre: 'Profilaxis dental' };
const ANA = { id: 'odo-2', nombre: 'Ana Quispe' };
const LUIS = { id: 'odo-1', nombre: 'Luis Pérez' };

/**
 * «Lo que me han hecho», deducido de las citas atendidas porque la API no tiene
 * otra cosa que ofrecerle al paciente.
 */
describe('agruparTratamientosRecibidos', () => {
  it('agrupa por tratamiento y cuenta las sesiones atendidas', () => {
    const recibidos = agruparTratamientosRecibidos([
      cita({ id: 'cit-1', dias: -10, estado: 'ATENDIDA', tratamiento: ENDODONCIA }),
      cita({ id: 'cit-2', dias: -30, estado: 'ATENDIDA', tratamiento: ENDODONCIA }),
      cita({ id: 'cit-3', dias: -60, estado: 'ATENDIDA', tratamiento: PROFILAXIS }),
    ]);

    expect(recibidos).toHaveLength(2);
    expect(recibidos[0]).toMatchObject({ nombre: 'Endodoncia unirradicular', sesiones: 2 });
    expect(recibidos[1]).toMatchObject({ nombre: 'Profilaxis dental', sesiones: 1 });
  });

  it('ignora las citas que no estan ATENDIDA', () => {
    // Una cita futura, una cancelada y una a la que no se asistió no son
    // tratamiento recibido: nadie tocó al paciente.
    const recibidos = agruparTratamientosRecibidos([
      cita({ id: 'cit-1', dias: 5, estado: 'CONFIRMADA', tratamiento: ENDODONCIA }),
      cita({ id: 'cit-2', dias: -3, estado: 'CANCELADA', tratamiento: ENDODONCIA }),
      cita({ id: 'cit-3', dias: -4, estado: 'NO_ASISTIO', tratamiento: ENDODONCIA }),
    ]);

    expect(recibidos).toEqual([]);
  });

  it('se queda con la fecha y el odontologo de la sesion mas reciente', () => {
    const recientes = cita({
      id: 'cit-1',
      dias: -2,
      estado: 'ATENDIDA',
      tratamiento: ENDODONCIA,
      odontologo: ANA,
    });
    const recibidos = agruparTratamientosRecibidos([
      cita({
        id: 'cit-2',
        dias: -40,
        estado: 'ATENDIDA',
        tratamiento: ENDODONCIA,
        odontologo: LUIS,
      }),
      recientes,
    ]);

    // Aunque la antigua llegue primero: la fecha no depende del orden de la
    // respuesta.
    expect(recibidos[0].ultimaFecha).toBe(recientes.fecha);
    expect(recibidos[0].ultimoOdontologo).toBe('Ana Quispe');
  });

  it('ordena los tratamientos por la sesion mas reciente primero', () => {
    const recibidos = agruparTratamientosRecibidos([
      cita({ id: 'cit-1', dias: -90, estado: 'ATENDIDA', tratamiento: ENDODONCIA }),
      cita({ id: 'cit-2', dias: -2, estado: 'ATENDIDA', tratamiento: PROFILAXIS }),
    ]);

    expect(recibidos.map((t) => t.tratamientoId)).toEqual(['tra-2', 'tra-1']);
  });

  it('sin citas atendidas devuelve una lista vacia', () => {
    expect(agruparTratamientosRecibidos([])).toEqual([]);
  });
});
