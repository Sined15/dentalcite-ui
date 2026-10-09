export type Rol = 'PACIENTE' | 'RECEPCIONISTA' | 'ODONTOLOGO' | 'ADMINISTRADOR';

export const ROLES: readonly Rol[] = ['PACIENTE', 'RECEPCIONISTA', 'ODONTOLOGO', 'ADMINISTRADOR'];

export const ROLES_DEL_ALTA_DE_CUENTA: readonly Rol[] = [
  'PACIENTE',
  'RECEPCIONISTA',
  'ADMINISTRADOR',
];

export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE';

export const TIPOS_DOCUMENTO: readonly TipoDocumento[] = ['DNI', 'CE', 'PASAPORTE'];

export const DIAS_SEMANA: readonly { valor: number; nombre: string }[] = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
  { valor: 7, nombre: 'Domingo' },
];
