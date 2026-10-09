import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { Odontologo } from '../models';
import { OdontologoService } from '../services/odontologo.service';
import { UsuarioService } from '../services/usuario.service';
import { cargarTodasLasPaginas } from './buscar-en-paginas';

export function miOdontologo(
  usuarios: UsuarioService,
  odontologos: OdontologoService,
): Observable<Odontologo | null> {
  return usuarios.obtenerPerfilPropio().pipe(
    switchMap((usuario) => {
      if (!usuario.fichaId) {
        return of(null);
      }
      return cargarTodasLasPaginas((pagina) =>
        odontologos.listar({ page: pagina, size: 100 }),
      ).pipe(map((lista) => lista.find((o) => o.fichaId === usuario.fichaId) ?? null));
    }),
    catchError(() => of(null)),
  );
}
