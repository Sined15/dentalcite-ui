import { CalendarioPublico } from '../models';


export function diaDeLaSemana(fecha: Date): number {
  const dia = fecha.getDay();
  return dia === 0 ? 7 : dia;
}

function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

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

export function filtroDeDias(
  calendario: CalendarioPublico | null,
  odontologoId?: string | null,
): (fecha: Date | null) => boolean {
  return (fecha) => (fecha ? seAtiende(calendario, fecha, odontologoId) : true);
}

export function claseDeDias(
  calendario: CalendarioPublico | null,
  odontologoId?: string | null,
): (fecha: Date, vista: 'month' | 'year' | 'multi-year') => string {
  return (fecha, vista) =>
    vista === 'month' && !seAtiende(calendario, fecha, odontologoId) ? 'dia-cerrado' : '';
}
