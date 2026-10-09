import { describe, expect, it } from 'vitest';
import { cita } from './citas.testing';
import { etiquetaEstado, instanteLocal, repartirCitas } from './repartir-citas';

describe('repartirCitas', () => {
  it('separa futuras y pasadas comparando fecha y hora locales', () => {
    const { futuras, pasadas } = repartirCitas([
      cita('cit-1', 3),
      cita('cit-2', -5, 'ATENDIDA'),
      cita('cit-3', 1),
    ]);

    expect(futuras.map((c) => c.id)).toEqual(['cit-3', 'cit-1']);
    expect(pasadas.map((c) => c.id)).toEqual(['cit-2']);
  });

  it('ordena las futuras de la mas cercana a la mas lejana', () => {
    const { futuras } = repartirCitas([cita('cit-1', 10), cita('cit-2', 4), cita('cit-3', 2)]);

    expect(futuras.map((c) => c.id)).toEqual(['cit-3', 'cit-2', 'cit-1']);
  });

  it('deja las pasadas como llegan, la mas reciente primero', () => {
    const { pasadas } = repartirCitas([
      cita('cit-1', -1, 'ATENDIDA'),
      cita('cit-2', -30, 'NO_ASISTIO'),
    ]);

    expect(pasadas.map((c) => c.id)).toEqual(['cit-1', 'cit-2']);
  });

  it('la que empieza justo ahora cuenta como futura', () => {
    const encurso = cita({ id: 'cit-1', dias: 0, hora: '10:00:00' });
    const ahora = instanteLocal(encurso.fecha, encurso.hora);

    expect(repartirCitas([encurso], ahora).futuras).toHaveLength(1);
    expect(repartirCitas([encurso], ahora + 1).pasadas).toHaveLength(1);
  });

  it('sin citas devuelve las dos listas vacias', () => {
    expect(repartirCitas([])).toEqual({ futuras: [], pasadas: [] });
  });
});

describe('instanteLocal', () => {
  it('no desplaza el dia al huso del navegador', () => {
    const fecha = new Date(instanteLocal('2026-09-14', '00:30:00'));

    expect(fecha.getDate()).toBe(14);
    expect(fecha.getMonth()).toBe(8);
    expect(fecha.getHours()).toBe(0);
  });
});

describe('etiquetaEstado', () => {
  it('traduce los estados de RN-09 en segunda persona', () => {
    expect(etiquetaEstado('CONFIRMADA')).toBe('Confirmada');
    expect(etiquetaEstado('ATENDIDA')).toBe('Atendida');
    expect(etiquetaEstado('NO_ASISTIO')).toBe('No asististe');
    expect(etiquetaEstado('CANCELADA')).toBe('Cancelada');
  });

  it('un estado desconocido se muestra tal cual en vez de desaparecer', () => {
    expect(etiquetaEstado('REPROGRAMADA')).toBe('REPROGRAMADA');
  });
});
