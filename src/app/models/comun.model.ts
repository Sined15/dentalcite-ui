/** Los cuatro roles del sistema. Viajan en mayusculas en el claim `rol`. */
export type Rol = 'PACIENTE' | 'RECEPCIONISTA' | 'ODONTOLOGO' | 'ADMINISTRADOR';

export const ROLES: readonly Rol[] = ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'];

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
