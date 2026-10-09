import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthService } from './auth.service';

export const sinSesionGuard: CanMatchFn = () => !inject(AuthService).estaAutenticado();
