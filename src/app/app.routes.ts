import { Routes } from '@angular/router';
import { passwordGuard } from './core/auth/password.guard';
import { rolGuard } from './core/auth/rol.guard';

const TODOS = ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'] as const;
const AGENDA = ['ODONTOLOGO', 'RECEPCIONISTA', 'ADMINISTRADOR'] as const;
const HORARIOS = ['ODONTOLOGO', 'ADMINISTRADOR'] as const;
const ADMIN = ['ADMINISTRADOR'] as const;

export const routes: Routes = [
  // Rutas publicas: no pasan por el shell ni por los guards.
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

  // Todo lo demas cuelga de una ruta protegida por `passwordGuard`, para que la
  // exigencia de cambiar la contraseña provisional no se pueda esquivar
  // navegando directamente a una URL.
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

      // Catalogo: lectura para todo rol autenticado, escritura solo ADMINISTRADOR.
      {
        path: 'especialidades',
        canActivate: [rolGuard],
        data: { roles: TODOS },
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
        data: { roles: TODOS },
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
        data: { roles: TODOS },
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

      // Los horarios cuelgan de su odontologo.
      {
        path: 'odontologos/:odontologoId/horarios',
        canActivate: [rolGuard],
        data: { roles: HORARIOS },
        loadComponent: () => import('./components/horario/horario-list').then((m) => m.HorarioList),
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

      // La raiz redirige segun el rol, no a una ruta fija: un PACIENTE no debe
      // aterrizar en /usuarios para recibir un 403.
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./components/inicio/inicio').then((m) => m.Inicio),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
