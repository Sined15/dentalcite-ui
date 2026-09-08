import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './app';

/**
 * El cajon de navegacion es lo unico del shell que cambia de forma segun el
 * dispositivo, y era lo unico que estaba fijo: `mode="side" opened` a cualquier
 * ancho, de modo que en un movil sus 15rem se comian la mitad de la pantalla y
 * el contenido quedaba inservible.
 *
 * Estas pruebas fijan las tres reglas de esa adaptacion. No comprueban la
 * maquetacion —jsdom no calcula estilos—, sino la decision que la gobierna.
 */

const ANCHO_ESCRITORIO = '(min-width: 56.25rem)';

/** Doble del observador del CDK: la consulta se responde desde una senal viva. */
class BreakpointObserverFalso {
  private readonly estado = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {},
  });

  observe(): Observable<BreakpointState> {
    return this.estado.asObservable();
  }

  isMatched(): boolean {
    return this.estado.value.matches;
  }

  /** Simula un cambio de ancho: girar el movil, redimensionar la ventana. */
  cambiarA(esEscritorio: boolean): void {
    this.estado.next({
      matches: esEscritorio,
      breakpoints: { [ANCHO_ESCRITORIO]: esEscritorio },
    });
  }
}

/** JWT sin firmar: al shell solo le interesa el rol y la caducidad. */
function sesion(rol: string): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = {
    iss: 'dentalcite',
    sub: 'a13d43f3-8930-4f00-baf2-70d492be76b2',
    rol,
    requiere_cambio_password: false,
    exp: Math.floor(Date.now() / 1000) + 8 * 3600,
  };
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

describe('App · cajon de navegacion adaptable', () => {
  let observador: BreakpointObserverFalso;
  let fixture: ComponentFixture<App>;

  /**
   * El ancho inicial se fija antes de crear el componente: `AuthService` y el
   * shell leen su estado de arranque en el constructor.
   */
  function montar(esEscritorio: boolean): void {
    localStorage.setItem('dentalcite.token', sesion('ADMINISTRADOR'));
    observador = new BreakpointObserverFalso();
    observador.cambiarA(esEscritorio);

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        // Rutas minimas: al shell solo le importa que la navegacion ocurra,
        // no a donde. `router-outlet` no renderiza nada aqui.
        provideRouter([
          { path: 'usuarios', children: [] },
          { path: '**', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: observador },
      ],
    });

    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  }

  function componente(): Record<string, () => unknown> {
    return fixture.componentInstance as unknown as Record<string, () => unknown>;
  }

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('en escritorio el cajon se reserva su espacio y arranca abierto', () => {
    montar(true);

    expect(componente()['modoCajon']()).toBe('side');
    expect(componente()['cajonAbierto']()).toBe(true);
  });

  it('en movil el cajon se superpone y arranca cerrado', () => {
    // Es el caso que no se cumplia: `opened` estaba puesto a mano en la
    // plantilla, asi que el cajon nacia abierto tambien en 390px de ancho.
    montar(false);

    expect(componente()['modoCajon']()).toBe('over');
    expect(componente()['cajonAbierto']()).toBe(false);
  });

  it('al pasar de movil a escritorio el cajon se abre solo', async () => {
    montar(false);

    observador.cambiarA(true);
    TestBed.tick();

    expect(componente()['modoCajon']()).toBe('side');
    expect(componente()['cajonAbierto']()).toBe(true);
  });

  it('en movil, navegar cierra el cajon superpuesto', async () => {
    montar(false);

    // Abierto a mano, como si el usuario hubiese pulsado el boton de la barra.
    (componente()['cajonAbierto'] as unknown as { set: (v: boolean) => void }).set(true);
    TestBed.tick();

    await TestBed.inject(Router).navigateByUrl('/usuarios');
    TestBed.tick();

    // Superpuesto, el cajon tapa el contenido: dejarlo abierto tras navegar
    // deja al usuario mirando el menu en vez de la pantalla que pidio.
    expect(componente()['cajonAbierto']()).toBe(false);
  });
});
