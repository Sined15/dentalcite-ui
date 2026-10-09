import { Observable, expand, filter, map, of, reduce, takeWhile } from 'rxjs';
import { PageResponse } from '../core/http/api.types';

export function buscarEnPaginas<T extends { id: string }>(
  cargarPagina: (pagina: number) => Observable<PageResponse<T>>,
  id: string,
): Observable<T | null> {
  return cargarPagina(0).pipe(
    expand((pagina) => (pagina.last ? of<PageResponse<T>>() : cargarPagina(pagina.number + 1))),
    map((pagina) => pagina.content.find((fila) => fila.id === id) ?? null),
    takeWhile((encontrado) => encontrado === null, true),
    reduce<T | null, T | null>((acc, actual) => acc ?? actual, null),
  );
}

export function cargarTodasLasPaginas<T>(
  cargarPagina: (pagina: number) => Observable<PageResponse<T>>,
): Observable<T[]> {
  return cargarPagina(0).pipe(
    expand((pagina) => (pagina.last ? of<PageResponse<T>>() : cargarPagina(pagina.number + 1))),
    filter((pagina) => pagina.content.length > 0),
    reduce<PageResponse<T>, T[]>((acc, pagina) => [...acc, ...pagina.content], []),
  );
}
