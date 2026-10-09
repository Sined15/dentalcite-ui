import { Route } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { passwordGuard } from './core/auth/password.guard';
import { rolGuard } from './core/auth/rol.guard';

type Rol = 'PACIENTE' | 'RECEPCIONISTA' | 'ODONTOLOGO' | 'ADMINISTRADOR';

const ALCANCE_EN_LA_API: Record<string, readonly Rol[]> = {
  perfil: ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  especialidades: ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  'especialidades/nuevo': ['ADMINISTRADOR'],
  'especialidades/editar/:id': ['ADMINISTRADOR'],
  tratamientos: ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  'tratamientos/nuevo': ['ADMINISTRADOR'],
  'tratamientos/editar/:id': ['ADMINISTRADOR'],
  odontologos: ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  'odontologos/nuevo': ['ADMINISTRADOR'],
  'odontologos/editar/:id': ['ADMINISTRADOR'],
  'mis-horarios': ['ODONTOLOGO', 'ADMINISTRADOR'],
  'odontologos/:odontologoId/horarios': ['ODONTOLOGO', 'ADMINISTRADOR'],
  disponibilidad: ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  citas: ['RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  'citas/pendientes': ['RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  'mis-citas': ['PACIENTE'],
  'mis-citas/historial': ['PACIENTE'],
  'mis-tratamientos': ['PACIENTE', 'ODONTOLOGO', 'ADMINISTRADOR'],
  'planes/:id': ['PACIENTE', 'ODONTOLOGO', 'ADMINISTRADOR'],
  seguimiento: ['ODONTOLOGO'],
  pacientes: ['RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  'pacientes/nuevo': ['RECEPCIONISTA', 'ADMINISTRADOR'],
  'pacientes/:id': ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  usuarios: ['ADMINISTRADOR'],
  'usuarios/nuevo': ['ADMINISTRADOR'],
  'usuarios/editar/:id': ['ADMINISTRADOR'],
  bloqueos: ['RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  'bloqueos/nuevo': ['RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
  'bloqueos/editar/:id': ['RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'],
};

function pantallasConSesion(): Route[] {
  const shell = routes.find((r) => r.canActivateChild?.includes(passwordGuard));
  expect(shell, 'no se encuentra el bloque protegido').toBeDefined();
  return shell!.children ?? [];
}

describe('rutas por rol', () => {
  it('toda pantalla con sesion declara rolGuard y sus roles', () => {
    for (const ruta of pantallasConSesion()) {
      expect(ruta.canActivate, ruta.path).toContain(rolGuard);
      expect((ruta.data?.['roles'] as Rol[] | undefined)?.length, ruta.path).toBeGreaterThan(0);
    }
  });

  it('toda pantalla con sesion tiene su alcance en la API apuntado', () => {
    const rutas = pantallasConSesion().map((r) => r.path ?? '');

    expect(new Set(rutas)).toEqual(new Set(Object.keys(ALCANCE_EN_LA_API)));
  });

  it('ninguna pantalla se ofrece a un rol al que su API responderia 403', () => {
    for (const ruta of pantallasConSesion()) {
      const alcance = ALCANCE_EN_LA_API[ruta.path ?? ''] ?? [];
      const ofrecida = (ruta.data?.['roles'] as Rol[] | undefined) ?? [];
      const sobrantes = ofrecida.filter((rol) => !alcance.includes(rol));

      expect(sobrantes, `${ruta.path} se ofrece de mas`).toEqual([]);
    }
  });
});
