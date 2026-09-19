import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { Odontologo } from '../models';
import { OdontologoService } from '../services/odontologo.service';
import { UsuarioService } from '../services/usuario.service';
import { cargarTodasLasPaginas } from './buscar-en-paginas';

/**
 * Traduce «yo» a «mi registro de odontólogo».
 *
 * De la cuenta sale la ficha y de la ficha el registro: es el mismo camino que
 * recorre el servidor para decidir si una operación es sobre lo propio, de modo
 * que preguntarlo de otra forma daría un veredicto distinto al suyo.
 *
 * Devuelve `null` —y nunca falla— cuando la cuenta no tiene ficha, cuando
 * ninguna coincide o cuando alguna de las dos llamadas se cae: quien lo usa
 * tiene que decidir qué enseñar en ese caso, y no hay nada que distinga esas
 * tres situaciones para el usuario.
 *
 * Un endpoint `/odontologos/me` lo resolvería en una sola llamada y sería más
 * limpio; sería también alcance nuevo en el servidor por un atajo, así que se
 * arma con lo que ya está publicado.
 */
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
