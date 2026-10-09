import { describe, expect, it } from 'vitest';
import { CalendarioPublico } from '../models';
import { claseDeDias, diaDeLaSemana, filtroDeDias, seAtiende } from './dias-de-atencion';

const CALENDARIO: CalendarioPublico = {
  diasDeAtencion: [1, 2, 3, 4, 5, 6],
  feriados: ['2026-07-28'],
  porOdontologo: [{ odontologoId: 'odo-1', dias: [1, 3, 5] }],
};

const DOMINGO = new Date(2026, 9, 11);
const LUNES = new Date(2026, 9, 12);
const MARTES = new Date(2026, 9, 13);
const FERIADO = new Date(2026, 6, 28);

describe('diaDeLaSemana', () => {
  it('cuenta de 1 lunes a 7 domingo, no desde el 0 de JavaScript', () => {
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
    expect(diaDeLaSemana(FERIADO)).toBe(2);
    expect(seAtiende(CALENDARIO, FERIADO)).toBe(false);
  });

  it('con un odontologo elegido valen sus dias y no los de la clinica', () => {
    expect(seAtiende(CALENDARIO, MARTES)).toBe(true);
    expect(seAtiende(CALENDARIO, MARTES, 'odo-1')).toBe(false);
    expect(seAtiende(CALENDARIO, LUNES, 'odo-1')).toBe(true);
  });

  it('un odontologo sin dias declarados cae en los de la clinica', () => {
    expect(seAtiende(CALENDARIO, MARTES, 'odo-9')).toBe(true);
  });

  it('mientras el calendario no llega, todo dia se considera abierto', () => {
    expect(seAtiende(null, DOMINGO)).toBe(true);
    expect(seAtiende(null, FERIADO, 'odo-1')).toBe(true);
  });
});

describe('filtroDeDias', () => {
  it('el campo vacio no deshabilita nada', () => {
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
    expect(clase(DOMINGO, 'year')).toBe('');
    expect(clase(DOMINGO, 'multi-year')).toBe('');
  });
});
