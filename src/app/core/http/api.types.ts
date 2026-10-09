export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface MessageResponse {
  message: string;
}

export type ValidationErrors = Record<string, string>;

export interface CitaAfectada {
  id: string;
  codigo: string;
  inicio: string;
  fin: string;
  paciente: string;
  numeroHistoria: string;
}

export interface BloqueoConflicto {
  message: string;
  citasActivas: CitaAfectada[];
}

export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string;
}
