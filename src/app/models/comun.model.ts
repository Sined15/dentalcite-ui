/** Los cuatro roles del sistema. Viajan en mayusculas en el claim `rol`. */
export type Rol = 'PACIENTE' | 'RECEPCIONISTA' | 'ODONTOLOGO' | 'ADMINISTRADOR';

export const ROLES: readonly Rol[] = ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'];

/**
 * Los roles que ofrece el alta de una cuenta de acceso.
 *
 * Falta ODONTOLOGO, y no por capricho: su cuenta no sirve de nada sin el
 * registro profesional al que se vincula —sin el no puede declarar su horario,
 * ver su agenda ni cerrar sus citas—, asi que las dos mitades se crean juntas en
 * «Odontologos».
 *
 * PACIENTE si esta, porque una cuenta de paciente es exactamente lo que el
 * administrador necesita crear para dar acceso al portal a quien se registro en
 * el mostrador y no se va a registrar el solo. Lo que el formulario exige es su
 * documento, para vincular la ficha que ya existe: sin ficha la cuenta no puede
 * reservar, que es lo unico que iba a hacer con ella.
 *
 * `ROLES` sigue completa para la edicion: cambiar el rol de una cuenta es una
 * operacion del administrador, y es lo que permite ascender a odontologo a quien
 * ya tenia cuenta.
 */
export const ROLES_DEL_ALTA_DE_CUENTA: readonly Rol[] = [
  'PACIENTE',
  'RECEPCIONISTA',
  'ADMINISTRADOR',
];

export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE';

export const TIPOS_DOCUMENTO: readonly TipoDocumento[] = ['DNI', 'CE', 'PASAPORTE'];

/** 1 lunes … 7 domingo, como los declara `HorarioRequest`. */
export const DIAS_SEMANA: readonly { valor: number; nombre: string }[] = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miercoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sabado' },
  { valor: 7, nombre: 'Domingo' },
];
