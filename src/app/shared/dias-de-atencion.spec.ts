import { describe, expect, it } from 'vitest';
import { CalendarioPublico } from '../models';
import { claseDeDias, diaDeLaSemana, filtroDeDias, seAtiende } from './dias-de-atencion';

/**
 * La clinica abre de lunes a sabado, cierra el domingo y el 28 de julio, y Juan
 * solo atiende lunes, miercoles y viernes.
 */
const CALENDARIO: CalendarioPublico = {
  diasDeAtencion: [1, 2, 3, 4, 5, 6],
  feriados: ['2026-07-28'],
  porOdontologo: [{ odontologoId: 'odo-1', dias: [1, 3, 5] }],
};

/** Octubre de 2026: el 11 es domingo, el 12 lunes y el 13 martes. */
const DOMINGO = new Date(2026, 9, 11);
const LUNES = new Date(2026, 9, 12);
const MARTES = new Date(2026, 9, 13);
const FERIADO = new Date(2026, 6, 28);

describe('diaDeLaSemana', () => {
  it('cuenta de 1 lunes a 7 domingo, no desde el 0 de JavaScript', () => {
    // El horario guarda el domingo como 7; `getDay()` lo da como 0, asi que
    // pasarlo tal cual lo confundiria con «ningun dia».
    expect(diaDeLaSemana(LUNES)).toBe(1);
    expect(diaDeLaSemana(DOMINGO)).toBe(7);
  });
});

describe('seAtiende', () => {
  it('el dia que declara alguien se atiende y el domingo no', () => {
    expect(seAtiende(CALENDARIO, LUNES)).toBe(true);
    expect(seAtiende(CALENDARIO, DOMINGO)).toBe(false);
  });

  it('el feriado no se atiende aunque caiga en dia laborable', () => {
    // El 28 de julio de 2026 es martes, y los martes la clinica abre.
    expect(diaDeLaSemana(FERIADO)).toBe(2);
    expect(seAtiende(CALENDARIO, FERIADO)).toBe(false);
  });

  it('con un odontologo elegido valen sus dias y no los de la clinica', () => {
    expect(seAtiende(CALENDARIO, MARTES)).toBe(true);
    expect(seAtiende(CALENDARIO, MARTES, 'odo-1')).toBe(false);
    expect(seAtiende(CALENDARIO, LUNES, 'odo-1')).toBe(true);
  });

  it('un odontologo sin dias declarados cae en los de la clinica', () => {
    // Es el caso de quien todavia no tiene horario: apagarle el calendario
    // entero diria «nunca atiende», cuando lo que falta es el dato.
    expect(seAtiende(CALENDARIO, MARTES, 'odo-9')).toBe(true);
  });

  it('mientras el calendario no llega, todo dia se considera abierto', () => {
    // Una consulta lenta o caida no puede dejar el mes entero en gris.
    expect(seAtiende(null, DOMINGO)).toBe(true);
    expect(seAtiende(null, FERIADO, 'odo-1')).toBe(true);
  });
});

describe('filtroDeDias', () => {
  it('el campo vacio no deshabilita nada', () => {
    // `matDatepickerFilter` recibe null cuando no hay fecha marcada; devolver
    // false ahi apagaria el calendario antes de abrirlo.
    expect(filtroDeDias(CALENDARIO)(null)).toBe(true);
  });

  it('apaga el dia cerrado y deja el abierto', () => {
    const admite = filtroDeDias(CALENDARIO);
    expect(admite(LUNES)).toBe(true);
    expect(admite(DOMINGO)).toBe(false);
  });
});

describe('claseDeDias', () => {
  it('marca el dia cerrado solo en la vista de mes', () => {
    const clase = claseDeDias(CALENDARIO);
    expect(clase(DOMINGO, 'month')).toBe('dia-cerrado');
    expect(clase(LUNES, 'month')).toBe('');
    // En la vista de años la celda es un año entero: teñirla no diria nada.
    expect(clase(DOMINGO, 'year')).toBe('');
    expect(clase(DOMINGO, 'multi-year')).toBe('');
  });
});
