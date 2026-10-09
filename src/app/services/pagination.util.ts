import { HttpParams } from '@angular/common/http';
import { PageQuery } from '../core/http/api.types';

export function buildPageParams(query: PageQuery = {}): HttpParams {
  let params = new HttpParams()
    .set('page', String(query.page ?? 0))
    .set('size', String(query.size ?? 20));
  if (query.sort) {
    params = params.set('sort', query.sort);
  }
  return params;
}
