import { PageResponse } from '../../core/http/api.types';
import { CitaResumen } from '../../models';

/**
 * Material de prueba compartido por las pantallas que leen
 * `GET /api/v1/citas/mias`: «Mis citas», «Historial» y «Tratamientos».
 *
 * Las tres parten del mismo cuerpo de respuesta, así que el fixture vive una vez
 * y no tres. No es código de producción: no lo importa ningún componente.
 */

/** "YYYY-MM-DD" de hoy más `dias`, en hora local y sin pasar por UTC. */
export function fechaLocal(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export interface CitaDePrueba {
  id: string;
  /** Días desde hoy: negativo para una cita pasada. */
  dias: number;
  estado?: CitaResumen['estado'];
  cancelable?: boolean;
  hora?: string;
  tratamiento?: { id: string; nombre: string };
  odontologo?: { id: string; nombre: string };
}

export function cita(datos: CitaDePrueba): CitaResumen;
export function cita(
  id: string,
  dias: number,
  estado?: CitaResumen['estado'],
  cancelable?: boolean,
): CitaResumen;
export function cita(
  idODatos: string | CitaDePrueba,
  dias = 0,
  estado: CitaResumen['estado'] = 'CONFIRMADA',
  cancelable = true,
): CitaResumen {
  const d: CitaDePrueba =
    typeof idODatos === 'string' ? { id: idODatos, dias, estado, cancelable } : idODatos;

  const estadoFinal = d.estado ?? 'CONFIRMADA';
  return {
    id: d.id,
    codigo: `CIT-00000${d.id.slice(-1)}`,
    fecha: fechaLocal(d.dias),
    hora: d.hora ?? '09:00:00',
    duracionMinutos: 30,
    zonaHoraria: 'America/Lima',
    estado: estadoFinal,
    motivoCancelacion: estadoFinal === 'CANCELADA' ? 'Ya no podia asistir' : null,
    cancelablePorPaciente: d.cancelable ?? true,
    paciente: { fichaId: 'fic-1', nombre: 'Ana Torres', numeroHistoria: 'HC-00042' },
    odontologo: d.odontologo ?? { id: 'odo-1', nombre: 'Luis Pérez' },
    tratamiento: d.tratamiento ?? { id: 'tra-1', nombre: 'Endodoncia' },
    consultorio: { id: 'con-1', nombre: 'Consultorio 2' },
  };
}

export function pagina(
  content: CitaResumen[],
  opciones: { number?: number; last?: boolean } = {},
): PageResponse<CitaResumen> {
  const numero = opciones.number ?? 0;
  const ultima = opciones.last ?? true;
  return {
    content,
    totalElements: content.length,
    totalPages: ultima ? numero + 1 : numero + 2,
    number: numero,
    size: 100,
    first: numero === 0,
    last: ultima,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}
