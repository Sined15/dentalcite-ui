import { Routes } from '@angular/router';
import { passwordGuard } from './core/auth/password.guard';
import { misHorariosGuard } from './components/horario/mis-horarios.guard';
import { rolGuard } from './core/auth/rol.guard';
import { sinSesionGuard } from './core/auth/sin-sesion.guard';

const TODOS = ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'] as const;
const AGENDA = ['ODONTOLOGO', 'RECEPCIONISTA', 'ADMINISTRADOR'] as const;
const RECEPCION = ['RECEPCIONISTA', 'ADMINISTRADOR'] as const;
const PERSONAL = ['RECEPCIONISTA', 'ADMINISTRADOR', 'ODONTOLOGO'] as const;
const HORARIOS = ['ODONTOLOGO', 'ADMINISTRADOR'] as const;
const RESERVAN = ['PACIENTE', 'RECEPCIONISTA', 'ADMINISTRADOR'] as const;
const SOLO_PACIENTE = ['PACIENTE'] as const;
const ADMIN = ['ADMINISTRADOR'] as const;
const LEEN_PLANES = ['PACIENTE', 'ODONTOLOGO', 'ADMINISTRADOR'] as const;
const SOLO_ODONTOLOGO = ['ODONTOLOGO'] as const;

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    loadComponent: () => import('./components/auth/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'cambiar-password',
    loadComponent: () =>
      import('./components/auth/cambiar-password/cambiar-password').then((m) => m.CambiarPassword),
  },
  {
    path: 'sin-permiso',
    loadComponent: () =>
      import('./components/auth/sin-permiso/sin-permiso').then((m) => m.SinPermiso),
  },

  {
    path: '',
    loadComponent: () =>
      import('./components/publico/publico-layout').then((m) => m.PublicoLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./components/publico/portada').then((m) => m.Portada),
      },
      {
        path: 'nuestras-especialidades',
        loadComponent: () =>
          import('./components/publico/especialidades-publicas').then(
            (m) => m.EspecialidadesPublicas,
          ),
      },
      {
        path: 'nuestras-especialidades/:id',
        loadComponent: () =>
          import('./components/publico/especialidad-detalle').then(
            (m) => m.EspecialidadDetalleComponent,
          ),
      },
      {
        path: 'nuestro-equipo',
        loadComponent: () =>
          import('./components/publico/odontologos-publicos').then((m) => m.OdontologosPublicos),
      },
      {
        path: 'disponibilidad',
        canMatch: [sinSesionGuard],
        loadComponent: () =>
          import('./components/disponibilidad/disponibilidad').then((m) => m.Disponibilidad),
      },
    ],
  },

  {
    path: '',
    canActivateChild: [passwordGuard],
    children: [
      {
        path: 'perfil',
        canActivate: [rolGuard],
        data: { roles: TODOS },
        loadComponent: () => import('./components/perfil/perfil').then((m) => m.Perfil),
      },

      {
        path: 'especialidades',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/especialidad/especialidad-list').then((m) => m.EspecialidadList),
      },
      {
        path: 'especialidades/nuevo',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/especialidad/especialidad-edit/especialidad-edit').then(
            (m) => m.EspecialidadEdit,
          ),
      },
      {
        path: 'especialidades/editar/:id',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/especialidad/especialidad-edit/especialidad-edit').then(
            (m) => m.EspecialidadEdit,
          ),
      },

      {
        path: 'tratamientos',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/tratamiento/tratamiento-list').then((m) => m.TratamientoList),
      },
      {
        path: 'tratamientos/nuevo',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/tratamiento/tratamiento-edit/tratamiento-edit').then(
            (m) => m.TratamientoEdit,
          ),
      },
      {
        path: 'tratamientos/editar/:id',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/tratamiento/tratamiento-edit/tratamiento-edit').then(
            (m) => m.TratamientoEdit,
          ),
      },

      {
        path: 'odontologos',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/odontologo/odontologo-list').then((m) => m.OdontologoList),
      },
      {
        path: 'odontologos/nuevo',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/odontologo/odontologo-edit/odontologo-edit').then(
            (m) => m.OdontologoEdit,
          ),
      },
      {
        path: 'odontologos/editar/:id',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/odontologo/odontologo-edit/odontologo-edit').then(
            (m) => m.OdontologoEdit,
          ),
      },

      {
        path: 'mis-horarios',
        canActivate: [rolGuard, misHorariosGuard],
        data: { roles: ['ODONTOLOGO', 'ADMINISTRADOR'] },
        children: [],
      },

      {
        path: 'odontologos/:odontologoId/horarios',
        canActivate: [rolGuard],
        data: { roles: HORARIOS },
        loadComponent: () => import('./components/horario/horario-list').then((m) => m.HorarioList),
      },

      {
        path: 'disponibilidad',
        canActivate: [rolGuard],
        data: { roles: RESERVAN },
        loadComponent: () =>
          import('./components/disponibilidad/disponibilidad').then((m) => m.Disponibilidad),
      },

      {
        path: 'citas',
        canActivate: [rolGuard],
        data: { roles: AGENDA },
        loadComponent: () => import('./components/cita/agenda').then((m) => m.Agenda),
      },

      {
        path: 'citas/pendientes',
        canActivate: [rolGuard],
        data: { roles: AGENDA },
        loadComponent: () =>
          import('./components/cita/pendientes-cierre').then((m) => m.PendientesCierre),
      },

      {
        path: 'mis-citas',
        canActivate: [rolGuard],
        data: { roles: SOLO_PACIENTE },
        loadComponent: () => import('./components/cita/mis-citas').then((m) => m.MisCitas),
      },

      {
        path: 'mis-citas/historial',
        canActivate: [rolGuard],
        data: { roles: SOLO_PACIENTE },
        loadComponent: () =>
          import('./components/cita/historial-citas').then((m) => m.HistorialCitas),
      },

      {
        path: 'mis-tratamientos',
        canActivate: [rolGuard],
        data: { roles: SOLO_PACIENTE },
        loadComponent: () =>
          import('./components/cita/mis-tratamientos').then((m) => m.MisTratamientos),
      },

      {
        path: 'planes/:id',
        canActivate: [rolGuard],
        data: { roles: LEEN_PLANES },
        loadComponent: () => import('./components/plan/plan-avance').then((m) => m.PlanAvance),
      },

      {
        path: 'seguimiento',
        canActivate: [rolGuard],
        data: { roles: SOLO_ODONTOLOGO },
        loadComponent: () =>
          import('./components/plan/seguimiento-planes').then((m) => m.SeguimientoPlanes),
      },

      {
        path: 'pacientes',
        canActivate: [rolGuard],
        data: { roles: PERSONAL },
        loadComponent: () =>
          import('./components/paciente/paciente-list').then((m) => m.PacienteList),
      },
      {
        path: 'pacientes/nuevo',
        canActivate: [rolGuard],
        data: { roles: RECEPCION },
        loadComponent: () =>
          import('./components/paciente/paciente-edit/paciente-edit').then((m) => m.PacienteEdit),
      },
      {
        path: 'pacientes/:id',
        canActivate: [rolGuard],
        data: { roles: TODOS },
        loadComponent: () =>
          import('./components/paciente/paciente-ficha/paciente-ficha').then((m) => m.PacienteFicha),
      },

      {
        path: 'usuarios',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () => import('./components/usuario/usuario-list').then((m) => m.UsuarioList),
      },
      {
        path: 'usuarios/nuevo',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/usuario/usuario-edit/usuario-edit').then((m) => m.UsuarioEdit),
      },
      {
        path: 'usuarios/editar/:id',
        canActivate: [rolGuard],
        data: { roles: ADMIN },
        loadComponent: () =>
          import('./components/usuario/usuario-edit/usuario-edit').then((m) => m.UsuarioEdit),
      },

      {
        path: 'bloqueos',
        canActivate: [rolGuard],
        data: { roles: AGENDA },
        loadComponent: () => import('./components/bloqueo/bloqueo-list').then((m) => m.BloqueoList),
      },
      {
        path: 'bloqueos/nuevo',
        canActivate: [rolGuard],
        data: { roles: AGENDA },
        loadComponent: () =>
          import('./components/bloqueo/bloqueo-edit/bloqueo-edit').then((m) => m.BloqueoEdit),
      },
      {
        path: 'bloqueos/editar/:id',
        canActivate: [rolGuard],
        data: { roles: AGENDA },
        loadComponent: () =>
          import('./components/bloqueo/bloqueo-edit/bloqueo-edit').then((m) => m.BloqueoEdit),
      },

    ],
  },

  { path: '**', redirectTo: '' },
];
