/** Referencia reducida a un recurso, tal como la devuelve `CitaResponseDTO`. */
export interface CitaReferencia {
  id: string;
  nombre: string;
}

/**
 * La cita recien creada (HU-09 · RF-15).
 *
 * `fecha` es "YYYY-MM-DD" y `hora` es "HH:mm:ss": hora local de la clinica,
 * anclada por `zonaHoraria`. Como en disponibilidad, **no convertirlas a `Date`**.
 */
export interface Cita {
  id: string;
  /** El codigo unico que se muestra al confirmar. */
  codigo: string;
  fecha: string;
  hora: string;
  duracionMinutos: number;
  zonaHoraria: string;
  /** RN-09: nace CONFIRMADA. */
  estado: string;
  tratamiento: CitaReferencia;
  odontologo: CitaReferencia;
  consultorio: CitaReferencia;
}

/**
 * Cuerpo de `POST /api/v1/citas`.
 *
 * `pacienteId` no es un campo opcional cualquiera: **quien puede mandarlo es lo
 * contrario segun el rol**. El PACIENTE tiene que omitirlo —su ficha sale del
 * token y mandarlo da 403, aunque sea la suya— y RECEPCIONISTA y ADMINISTRADOR
 * tienen que incluirlo, porque su cuenta no tiene ficha para la que reservar
 * (HU-14 · RF-17).
 */
export interface CitaRequest {
  /** La ficha del paciente. Solo lo manda recepcion o administracion. */
  pacienteId?: string;
  tratamientoId: string;
  odontologoId: string;
  /** "YYYY-MM-DD". */
  fecha: string;
  /** "HH:mm", hora local de la clinica. */
  hora: string;
}

/** RN-09: la maquina de estados de la cita, sin retorno. */
export const ESTADOS_CITA = ['CONFIRMADA', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA'] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];

/** El paciente tal como lo identifica recepcion: por su historia clinica. */
export interface CitaPaciente {
  fichaId: string;
  nombre: string;
  numeroHistoria: string;
}

/**
 * Una fila de la agenda (HU-11 · RF-18).
 *
 * Como en `Cita`, `fecha` y `hora` son cadenas en hora local de la clinica y
 * **no se convierten a `Date`**: hacerlo las desplazaria al huso del navegador.
 */
export interface CitaResumen {
  id: string;
  codigo: string;
  fecha: string;
  hora: string;
  duracionMinutos: number;
  zonaHoraria: string;
  estado: EstadoCita;
  /** Solo en las canceladas. */
  motivoCancelacion: string | null;
  /**
   * Si el paciente titular puede cancelarla ahora por su cuenta (HU-15 · RN-06).
   *
   * Lo calcula el servidor: la regla tiene una excepcion —la cita que el propio
   * paciente reservo con menos de la antelacion de la ventana— que depende de
   * quien la creo y de cuando, y rehacerla aqui seria tenerla dos veces y con
   * dos relojes. El portal solo obedece.
   */
  cancelablePorPaciente: boolean;
  paciente: CitaPaciente;
  odontologo: CitaReferencia;
  tratamiento: CitaReferencia;
  consultorio: CitaReferencia;
}

/** Filtros de `GET /api/v1/citas`. Los dos ultimos son opcionales. */
export interface CitaQuery {
  /** "YYYY-MM-DD", inclusive. */
  desde: string;
  /** "YYYY-MM-DD", inclusive. */
  hasta: string;
  odontologoId?: string;
  estado?: EstadoCita | '';
}

/**
 * Filtros de `GET /api/v1/citas/mias` (HU-15). Los tres son opcionales: sin
 * rango se devuelven todas, que es lo que pide «las futuras y las pasadas».
 */
export interface MisCitasQuery {
  /** "YYYY-MM-DD", inclusive. */
  desde?: string;
  /** "YYYY-MM-DD", inclusive. */
  hasta?: string;
  estado?: EstadoCita | '';
}

/** Cuerpo de `PATCH /api/v1/citas/{id}/cancelar`. El motivo es obligatorio (RF-20). */
export interface CancelacionRequest {
  motivo: string;
}

/** Quien ordeno una transicion. Nulo si no la origino una persona. */
export interface CitaResponsable {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
}

/**
 * Una transicion de la cita (RF-21).
 *
 * `ocurridoEn` si es un instante ISO con desfase, no una hora local: una bitacora
 * vale por ser inequivoca, no por ser comoda de leer.
 */
export interface CitaHistorial {
  id: string;
  /** Nulo en el alta. */
  estadoAnterior: EstadoCita | null;
  estadoNuevo: EstadoCita;
  motivo: string | null;
  ocurridoEn: string;
  responsable: CitaResponsable | null;
}
