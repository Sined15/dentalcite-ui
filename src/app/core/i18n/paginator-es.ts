import { MatPaginatorIntl } from '@angular/material/paginator';

/**
 * `MatPaginatorIntl` viene en inglés por defecto ("Items per page", "1 - 8 of
 * 8"), lo que rompe la coherencia de una interfaz en español.
 */
export function paginadorEnEspanol(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Elementos por página:';
  intl.nextPageLabel = 'Página siguiente';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primera página';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (pagina: number, tamano: number, total: number): string => {
    if (total === 0 || tamano === 0) {
      return `0 de ${total}`;
    }
    const desde = pagina * tamano;
    const hasta = Math.min(desde + tamano, total);
    return `${desde + 1} - ${hasta} de ${total}`;
  };
  return intl;
}
