import { Observable, catchError, map, of } from 'rxjs';
import { PublicoService } from '../services/publico.service';

/**
 * Qué especialidad ejerce cada tratamiento, por identificador de tratamiento.
 *
 * Un plan solo trae el nombre del tratamiento, y el color y el icono de la tarjeta
 * salen de la especialidad. El catálogo público ya la conoce; si falla, el mapa queda
 * vacío y la tarjeta cae al neutro del sistema en lugar de romper la pantalla.
 */
export function especialidadPorTratamiento(
  publico: PublicoService,
): Observable<ReadonlyMap<string, string>> {
  return publico.tratamientos().pipe(
    map((lista) => new Map(lista.map((t) => [t.id, t.especialidadNombre] as const))),
    catchError(() => of(new Map<string, string>())),
  );
}
