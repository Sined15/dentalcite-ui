import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { OdontologoService } from '../../services/odontologo.service';
import { UsuarioService } from '../../services/usuario.service';
import { miOdontologo } from '../../shared/mi-odontologo';

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
