import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { OdontologoService } from '../../services/odontologo.service';
import { UsuarioService } from '../../services/usuario.service';
import { miOdontologo } from '../../shared/mi-odontologo';

/**
 * El odontólogo puede declarar su propio horario, y la API lo admite desde el
 * principio: `/api/v1/odontologos/{id}/horarios` acepta su token. Lo que no
 * existía era el **camino**. La pantalla cuelga del identificador del registro
 * de odontólogo, y el único listado que lo contiene es el de la consola de
 * administración, cerrado a su rol: sin conocer la URL a mano, un odontólogo no
 * podía llegar a declarar cuándo atiende.
 *
 * Esta guarda es ese camino: resuelve su registro con {@link miOdontologo} y
 * devuelve el destino ya armado, de modo que `/mis-horarios` no necesita
 * pantalla propia ni duplicar `HorarioList`. Una cuenta sin ficha, o cuya ficha
 * no tiene registro, no tiene horario que abrir y va a parar al aviso de
 * permisos: es la misma situación que el servidor rechaza con 403, y enseñarla
 * es mejor que dejar una pantalla en blanco.
 */
export const misHorariosGuard: CanActivateFn = () => {
  const usuarioService = inject(UsuarioService);
  const odontologoService = inject(OdontologoService);
  const router = inject(Router);

  return miOdontologo(usuarioService, odontologoService).pipe(
    map((mio) =>
      mio
        ? router.createUrlTree(['/odontologos', mio.id, 'horarios'])
        : router.createUrlTree(['/sin-permiso']),
    ),
  );
};
