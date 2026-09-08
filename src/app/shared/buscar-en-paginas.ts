import { Observable, expand, filter, map, of, reduce, takeWhile } from 'rxjs';
import { PageResponse } from '../core/http/api.types';

/**
 * Recupera un registro por id recorriendo las paginas del listado.
 *
 * Especialidad, tratamiento y odontologo no exponen `GET /{id}`: el formulario
 * de edicion recibe la fila por estado de navegacion y solo llega aqui cuando
 * ese estado se perdio, tipicamente porque el usuario recargo la pagina.
 */
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

/**
 * Descarga todas las paginas de un listado paginado y las concatena.
 *
 * Los endpoints del catalogo no aceptan parametro de busqueda, asi que filtrar
 * solo sobre la pagina cargada dejaba fuera cualquier coincidencia a partir de
 * la fila 21. A la escala de una clinica —decenas o cientos de registros— traer
 * el conjunto y filtrarlo en cliente es la opcion correcta; si el volumen
 * creciera, la solucion es un parametro de busqueda en el servidor, no volver a
 * filtrar por pagina.
 */
export function cargarTodasLasPaginas<T>(
  cargarPagina: (pagina: number) => Observable<PageResponse<T>>,
): Observable<T[]> {
  return cargarPagina(0).pipe(
    expand((pagina) => (pagina.last ? of<PageResponse<T>>() : cargarPagina(pagina.number + 1))),
    filter((pagina) => pagina.content.length > 0),
    reduce<PageResponse<T>, T[]>((acc, pagina) => [...acc, ...pagina.content], []),
  );
}
