import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { authInterceptor } from './core/auth/auth.interceptor';
import { paginadorEnEspanol } from './core/i18n/paginator-es';
import { routes } from './app.routes';

// Fechas y numeros en el formato del pais, no en en-US.
registerLocaleData(localeEsPe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Sin zone.js: la deteccion de cambios la disparan las senales, que es lo
    // que esta aplicacion usa para todo su estado local.
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    { provide: MatPaginatorIntl, useFactory: paginadorEnEspanol },
    // Ningun dialogo debe desbordar la ventana. El maximo por defecto de
    // Material es 80vw, que en un movil desperdicia un quinto del ancho; y las
    // llamadas que fijan `width` en rem lo superaban en pantallas estrechas.
    // `maxWidth` gana siempre a `width`, asi que basta con acotarlo aqui.
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { maxWidth: '95vw', maxHeight: '90dvh', autoFocus: 'first-tabbable' },
    },
    // Por defecto, el campo reserva una sola linea bajo el control para su
    // pista o su error. En un movil esos textos ocupan dos o tres lineas, y el
    // sobrante se dibujaba encima del campo siguiente: la pista de «Cuenta de
    // odontologo» tapaba «Especialidades». Con `dynamic` el hueco crece con el
    // texto y empuja lo que viene debajo, que es lo correcto cuando el mensaje
    // de verdad necesita mas de una linea.
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { subscriptSizing: 'dynamic' },
    },
    // Angular Material 22 anima con CSS y no declara @angular/animations como
    // peer: no hace falta ningun proveedor de animaciones.
  ],
};
