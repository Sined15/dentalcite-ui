import { Routes } from '@angular/router';
import { passwordGuard } from './core/auth/password.guard';
import { rolGuard } from './core/auth/rol.guard';

const TODOS = ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'] as const;
const AGENDA = ['ODONTOLOGO', 'RECEPCIONISTA', 'ADMINISTRADOR'] as const;
// HU-11: la agenda de citas expone los datos de todos los pacientes, asi que no
// puede reutilizar AGENDA —que incluye al ODONTOLOGO, y sus citas son solo las
// suyas—. Que el odontologo vea las propias es parte de RF-18, pero con la
// comprobacion de propiedad que HU-15 traera.
const RECEPCION = ['RECEPCIONISTA', 'ADMINISTRADOR'] as const;
// RF-07 da la busqueda de pacientes al «personal»: los tres roles que atienden.
const PERSONAL = ['RECEPCIONISTA', 'ADMINISTRADOR', 'ODONTOLOGO'] as const;
const HORARIOS = ['ODONTOLOGO', 'ADMINISTRADOR'] as const;
// HU-15: sus propias citas las ve y las cancela el paciente, y solo el paciente.
// La agenda de la clinica es otra pantalla y otro rol.
const SOLO_PACIENTE = ['PACIENTE'] as const;
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

      // HU-08: la consulta de franjas la ve cualquier rol autenticado, porque
      // el paciente es su destinatario principal.
      {
        path: 'disponibilidad',
        canActivate: [rolGuard],
        data: { roles: TODOS },
        loadComponent: () =>
          import('./components/disponibilidad/disponibilidad').then((m) => m.Disponibilidad),
      },

      // HU-11: la agenda del dia y la cancelacion desde recepcion.
      {
        path: 'citas',
        canActivate: [rolGuard],
        data: { roles: RECEPCION },
        loadComponent: () => import('./components/cita/agenda').then((m) => m.Agenda),
      },

      // HU-15 · RF-18, RF-19: las citas propias del paciente. Ruta aparte de
      // '/citas' y no un filtro suyo, porque el servidor tambien las separa:
      // GET /api/v1/citas es la agenda de la clinica y GET /api/v1/citas/mias
      // saca la ficha del token.
      {
        path: 'mis-citas',
        canActivate: [rolGuard],
        data: { roles: SOLO_PACIENTE },
        loadComponent: () => import('./components/cita/mis-citas').then((m) => m.MisCitas),
      },

      // HU-13 · RF-07: la busqueda es del personal.
      {
        path: 'pacientes',
        canActivate: [rolGuard],
        data: { roles: PERSONAL },
        loadComponent: () =>
          import('./components/paciente/paciente-list').then((m) => m.PacienteList),
      },
      // HU-12: el alta presencial. Va **antes** que 'pacientes/:id' para que
      // «nuevo» no se lea como un identificador de ficha.
      {
        path: 'pacientes/nuevo',
        canActivate: [rolGuard],
        data: { roles: RECEPCION },
        loadComponent: () =>
          import('./components/paciente/paciente-edit/paciente-edit').then((m) => m.PacienteEdit),
      },
      // HU-13 · RF-08: la ficha la alcanzan los cuatro roles, pero no sobre
      // cualquiera. Quien puede ver cual lo decide el servidor con un 403: aqui
      // no se puede saber si esta ficha es «la propia» o «un paciente mio».
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
