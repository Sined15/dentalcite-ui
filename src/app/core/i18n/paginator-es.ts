import { MatPaginatorIntl } from '@angular/material/paginator';

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
