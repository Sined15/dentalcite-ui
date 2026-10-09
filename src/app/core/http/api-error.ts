import { HttpErrorResponse } from '@angular/common/http';
import { BloqueoConflicto, CitaAfectada } from './api.types';

export function mensajeDeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocurrió un error inesperado.';
  }

  if (error.status === 0) {
    return 'No se pudo contactar con el servidor. Comprueba que esté en marcha.';
  }

  const cuerpo: unknown = error.error;

  if (cuerpo && typeof cuerpo === 'object') {
    const registro = cuerpo as Record<string, unknown>;

    if (typeof registro['message'] === 'string') {
      return registro['message'];
    }

    const mensajes = Object.values(registro).filter((v): v is string => typeof v === 'string');
    if (mensajes.length > 0) {
      return mensajes.join(' ');
    }
  }

  if (typeof cuerpo === 'string' && cuerpo.trim().length > 0) {
    return cuerpo;
  }

  switch (error.status) {
    case 401:
      return 'Credenciales incorrectas o sesión caducada.';
    case 403:
      return 'No tienes permiso para realizar esta acción.';
    case 404:
      return 'El recurso solicitado no existe.';
    case 409:
      return 'La operación entra en conflicto con el estado actual.';
    case 422:
      return 'La solicitud no cumple una regla del sistema.';
    case 423:
      return 'Cuenta bloqueada temporalmente. Inténtalo de nuevo en unos minutos.';
    default:
      return 'Ocurrió un error inesperado.';
  }
}

export function erroresDeValidacion(error: unknown): Record<string, string> | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return null;
  }
  const cuerpo: unknown = error.error;
  if (!cuerpo || typeof cuerpo !== 'object' || 'message' in cuerpo) {
    return null;
  }
  const entradas = Object.entries(cuerpo as Record<string, unknown>).filter(
    (par): par is [string, string] => typeof par[1] === 'string',
  );
  return entradas.length > 0 ? Object.fromEntries(entradas) : null;
}

export function citasAfectadas(error: unknown): CitaAfectada[] | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
    return null;
  }
  const cuerpo = error.error as Partial<BloqueoConflicto> | null;
  return Array.isArray(cuerpo?.citasActivas) ? cuerpo.citasActivas : null;
}
