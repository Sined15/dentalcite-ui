import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { citasAfectadas, erroresDeValidacion, mensajeDeError } from './api-error';

/**
 * Fija el contrato de errores del backend.
 *
 * Los cuerpos de 400 y 404 se capturaron del backend en ejecucion el
 * 2026-09-07. El backend usa tres formas distintas y confundirlas deja al
 * usuario sin mensaje, asi que conviene que un cambio en el servidor rompa
 * estas pruebas en vez de romper la interfaz en silencio.
 */
describe('api-error', () => {
  it('extrae el mensaje del 400 de validacion, que es un mapa campo -> mensaje', () => {
    // Real: POST /api/v1/especialidades con cuerpo {}
    const error = new HttpErrorResponse({
      status: 400,
      error: { nombre: 'El nombre de la especialidad es obligatorio' },
    });

    expect(mensajeDeError(error)).toBe('El nombre de la especialidad es obligatorio');
    expect(erroresDeValidacion(error)).toEqual({
      nombre: 'El nombre de la especialidad es obligatorio',
    });
  });

  it('junta los mensajes cuando el 400 senala varios campos', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { correo: 'Correo invalido', password: 'La contraseña es obligatoria' },
    });

    expect(mensajeDeError(error)).toContain('Correo invalido');
    expect(mensajeDeError(error)).toContain('La contraseña es obligatoria');
  });

  it('extrae el mensaje de la forma habitual { message }', () => {
    // Real: PUT /api/v1/especialidades/<id inexistente>
    const error = new HttpErrorResponse({
      status: 404,
      error: { message: 'Especialidad no encontrada.' },
    });

    expect(mensajeDeError(error)).toBe('Especialidad no encontrada.');
    // Un 404 no es un error de validacion: no debe leerse como mapa de campos.
    expect(erroresDeValidacion(error)).toBeNull();
  });

  it('no confunde un 400 con { message } con el mapa de validacion', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: 'Debe indicar un odontologo o un consultorio' },
    });

    expect(mensajeDeError(error)).toBe('Debe indicar un odontologo o un consultorio');
    expect(erroresDeValidacion(error)).toBeNull();
  });

  it('extrae las citas afectadas del 409 de bloqueos', () => {
    const cita = {
      id: 'a1',
      codigo: 'CT-001',
      inicio: '2026-09-10T09:00:00-05:00',
      fin: '2026-09-10T09:30:00-05:00',
      paciente: 'Ana Ruiz',
      numeroHistoria: 'HC-00007',
    };
    const error = new HttpErrorResponse({
      status: 409,
      error: { message: 'El rango alcanza citas activas', citasActivas: [cita] },
    });

    expect(citasAfectadas(error)).toEqual([cita]);
    expect(mensajeDeError(error)).toBe('El rango alcanza citas activas');
  });

  it('no devuelve citas para un 409 corriente', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { message: 'La contraseña actual no coincide' },
    });

    expect(citasAfectadas(error)).toBeNull();
  });

  it('da un mensaje propio al 423 del bloqueo por intentos fallidos', () => {
    const error = new HttpErrorResponse({ status: 423, error: null });
    expect(mensajeDeError(error)).toContain('bloqueada');
  });

  it('distingue el fallo de red del error de servidor', () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
    expect(mensajeDeError(error)).toContain('No se pudo contactar');
  });
});
