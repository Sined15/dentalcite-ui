import { Routes } from '@angular/router';
import { passwordGuard } from './core/auth/password.guard';
import { misHorariosGuard } from './components/horario/mis-horarios.guard';
import { rolGuard } from './core/auth/rol.guard';
import { sinSesionGuard } from './core/auth/sin-sesion.guard';

const TODOS = ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'] as const;
const AGENDA = ['ODONTOLOGO', 'RECEPCIONISTA', 'ADMINISTRADOR'] as const;
const RECEPCION = ['RECEPCIONISTA', 'ADMINISTRADOR'] as const;
// RF-07 da la busqueda de pacientes al «personal»: los tres roles que atienden.
const PERSONAL = ['RECEPCIONISTA', 'ADMINISTRADOR', 'ODONTOLOGO'] as const;
const HORARIOS = ['ODONTOLOGO', 'ADMINISTRADOR'] as const;
// La consulta de franjas es de quien va a reservar sobre ellas: el paciente para
// si mismo y recepcion en nombre de alguien. El odontologo queda fuera aunque la
// API se la conceda: lo que ocupa su jornada lo ve en su agenda, y una parrilla
// de horas libres que no puede pulsar solo le hacia preguntarse que se esperaba
// de el ahi.
const RESERVAN = ['PACIENTE', 'RECEPCIONISTA', 'ADMINISTRADOR'] as const;
// HU-15: sus propias citas las ve y las cancela el paciente, y solo el paciente.
// La agenda de la clinica es otra pantalla y otro rol.
const SOLO_PACIENTE = ['PACIENTE'] as const;
const ADMIN = ['ADMINISTRADOR'] as const;
// Quien lee el avance de un plan: el paciente los suyos, el odontologo los de sus
// pacientes y administracion todos. Recepcion no trabaja con planes.
const LEEN_PLANES = ['PACIENTE', 'ODONTOLOGO', 'ADMINISTRADOR'] as const;
const SOLO_ODONTOLOGO = ['ODONTOLOGO'] as const;

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

  // Area publica (HU-06, v4): el visitante recorre el catalogo sin cuenta. No
  // pasa por `passwordGuard` ni por `rolGuard`, y no la envuelve el shell: la
  // envuelve `PublicoLayout`, con su propia cabecera. Los nombres evitan chocar
  // con /especialidades y /odontologos, que son las pantallas de mantenimiento.
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
      // La consulta de franjas sin cuenta. Es la misma URL y la misma pantalla
      // que la del portal, declarada dos veces: esta solo casa sin sesion y la
      // envuelve el marco publico; con sesion no casa, el enrutador sigue y
      // encuentra la de mas abajo, dentro del shell y con sus guardas. Asi el
      // `returnUrl` que deja el visitante vale tal cual despues de entrar.
      {
        path: 'disponibilidad',
        canMatch: [sinSesionGuard],
        loadComponent: () =>
          import('./components/disponibilidad/disponibilidad').then((m) => m.Disponibilidad),
      },
    ],
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
        // v4: pantalla de mantenimiento, y el criterio de HU-06 dice que quien no
        // administra no ve acciones de mantenimiento. Los otros roles no pierden
        // lectura del catalogo: la tienen en las paginas publicas.
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
        // v4: pantalla de mantenimiento, y el criterio de HU-06 dice que quien no
        // administra no ve acciones de mantenimiento. Los otros roles no pierden
        // lectura del catalogo: la tienen en las paginas publicas.
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
        // v4: pantalla de mantenimiento, y el criterio de HU-06 dice que quien no
        // administra no ve acciones de mantenimiento. Los otros roles no pierden
        // lectura del catalogo: la tienen en las paginas publicas.
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

      // El atajo del odontologo a su propio horario. No es una pantalla, es una
      // traduccion de «yo» a «mi registro», asi que la guarda resuelve el destino
      // y redirige a la de siempre.
      {
        path: 'mis-horarios',
        canActivate: [rolGuard, misHorariosGuard],
        data: { roles: ['ODONTOLOGO', 'ADMINISTRADOR'] },
        children: [],
      },

      // Los horarios cuelgan de su odontologo.
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

      // La agenda del dia y la cancelacion desde recepcion. El odontologo entra
      // a la misma pantalla y ve **las suyas**. Que el ambito sea el suyo no es un
      // patron de ruta y no puede serlo: lo fija el servidor desde el token, de
      // modo que la guarda solo abre la puerta. Cancelar sigue siendo de
      // recepcion, y eso lo comprueba la API.
      {
        path: 'citas',
        canActivate: [rolGuard],
        data: { roles: AGENDA },
        loadComponent: () => import('./components/cita/agenda').then((m) => m.Agenda),
      },

      // HU-16 · RF-22: la cola de citas por cerrar. Va **antes** que '/citas'
      // no por precedencia —son rutas distintas— sino porque se lee junto a
      // ella. El odontologo entra aqui aunque no alcance la agenda: son suyas.
      {
        path: 'citas/pendientes',
        canActivate: [rolGuard],
        data: { roles: AGENDA },
        loadComponent: () =>
          import('./components/cita/pendientes-cierre').then((m) => m.PendientesCierre),
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

      // Las pasadas, que antes eran una seccion de la pantalla anterior. Cuelga
      // de 'mis-citas' porque es lo mismo mirado hacia atras, y asi el grupo del
      // menu se corresponde con el prefijo de la ruta.
      {
        path: 'mis-citas/historial',
        canActivate: [rolGuard],
        data: { roles: SOLO_PACIENTE },
        loadComponent: () =>
          import('./components/cita/historial-citas').then((m) => m.HistorialCitas),
      },

      // Los tratamientos que el paciente ha recibido, no el catalogo: por eso no
      // es '/tratamientos', que ya existe y es el mantenimiento del ADMINISTRADOR.
      {
        path: 'mis-tratamientos',
        canActivate: [rolGuard],
        data: { roles: SOLO_PACIENTE },
        loadComponent: () =>
          import('./components/cita/mis-tratamientos').then((m) => m.MisTratamientos),
      },

      // El avance de un plan y su linea de tiempo. La abren el paciente, el
      // odontologo y administracion, pero no sobre cualquier plan: cual puede
      // leer cada uno lo decide el servidor con un 403.
      {
        path: 'planes/:id',
        canActivate: [rolGuard],
        data: { roles: LEEN_PLANES },
        loadComponent: () => import('./components/plan/plan-avance').then((m) => m.PlanAvance),
      },

      // Los planes de los pacientes del odontologo. Solo suyo: recepcion no
      // planifica y administracion los ve desde la ficha de cada paciente.
      {
        path: 'seguimiento',
        canActivate: [rolGuard],
        data: { roles: SOLO_ODONTOLOGO },
        loadComponent: () =>
          import('./components/plan/seguimiento-planes').then((m) => m.SeguimientoPlanes),
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

    ],
  },

  { path: '**', redirectTo: '' },
];
