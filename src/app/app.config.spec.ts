import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig } from '@angular/material/dialog';
import { describe, expect, it } from 'vitest';
import { appConfig } from './app.config';

function opcionesDeDialogo(): MatDialogConfig {
  const proveedor = appConfig.providers.find(
    (p) => typeof p === 'object' && p !== null && 'provide' in p && p.provide === MAT_DIALOG_DEFAULT_OPTIONS,
  ) as { useValue: MatDialogConfig } | undefined;
  expect(proveedor, 'no se encuentra MAT_DIALOG_DEFAULT_OPTIONS').toBeDefined();
  return proveedor!.useValue;
}

describe('opciones por defecto de los dialogos', () => {
  it('devuelven el foco a quien abrio el dialogo al cerrarlo', () => {
    expect(opcionesDeDialogo().restoreFocus).toBe(true);
  });

  it('conservan el resto de predeterminados de Material', () => {
    const material = new MatDialogConfig();
    const nuestras = opcionesDeDialogo();

    expect(nuestras.hasBackdrop).toBe(material.hasBackdrop);
    expect(nuestras.role).toBe(material.role);
    expect(nuestras.closeOnNavigation).toBe(material.closeOnNavigation);
  });
});
