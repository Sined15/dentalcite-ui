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

/**
 * HU-06 (v4) · El area publica no lleva shell, ni siquiera con sesion abierta.
 *
 * Se comprueba con sesion a proposito: sin token el shell nunca aparece, asi que
 * una prueba sin sesion pasaria diga lo que diga `esRutaPublica`. El caso que de
 * verdad distingue es el del usuario identificado que navega al catalogo
 * publico: si el shell lo envolviera, la pagina saldria con dos cabeceras
 * superpuestas, la del portal y la publica.
 */
describe('App · el area publica no se envuelve con el shell', () => {
  function montar(): ComponentFixture<App> {
    localStorage.setItem('dentalcite.token', sesion('PACIENTE'));
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'perfil', children: [] },
          { path: 'nuestras-especialidades', children: [] },
          { path: 'nuestro-equipo', children: [] },
          { path: '', children: [] },
          { path: '**', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: new BreakpointObserverFalso() },
      ],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  }

  function muestraShell(fixture: ComponentFixture<App>): boolean {
    return (fixture.componentInstance as unknown as Record<string, () => boolean>)['mostrarShell']();
  }

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('con sesion abierta, las rutas publicas no llevan shell', async () => {
    const fixture = montar();
    const router = TestBed.inject(Router);

    for (const ruta of ['/', '/nuestras-especialidades', '/nuestro-equipo']) {
      await router.navigateByUrl(ruta);
      TestBed.tick();
      expect(muestraShell(fixture), `${ruta} no debe llevar shell`).toBe(false);
    }
  });

  it('la raiz se compara exacta: una ruta del portal si lleva shell', async () => {
    // `'/'` con `startsWith` casaria con todas las rutas y dejaria el portal
    // entero sin cajon de navegacion.
    const fixture = montar();

    await TestBed.inject(Router).navigateByUrl('/perfil');
    TestBed.tick();

    expect(muestraShell(fixture)).toBe(true);
  });
});

/**
 * El menu del paciente: un grupo «Citas» que se despliega y una entrada propia
 * de tratamientos.
 *
 * Lo que se fija aqui no es el aspecto del desplegable, sino las dos decisiones
 * que lo gobiernan: quien ve cada entrada —la misma tabla de roles que aplican
 * los guards— y cuando un grupo aparece abierto.
 */
describe('App · menu del paciente', () => {
  /**
   * Se entra por una ruta del portal y no por la raiz: `/` es publica desde la
   * revision v4, y ahi el shell —con su cajon y su menu— no se pinta.
   */
  async function montarEn(rol: string, ruta: string): Promise<ComponentFixture<App>> {
    const fixture = montar(rol);
    await TestBed.inject(Router).navigateByUrl(ruta);
    TestBed.tick();
    fixture.detectChanges();
    return fixture;
  }

  function montar(rol: string): ComponentFixture<App> {
    localStorage.setItem('dentalcite.token', sesion(rol));
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'mis-citas', children: [] },
          { path: 'mis-citas/historial', children: [] },
          { path: 'mis-tratamientos', children: [] },
          { path: 'bloqueos', children: [] },
          { path: '**', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: new BreakpointObserverFalso() },
      ],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  }

  function etiquetas(fixture: ComponentFixture<App>): string[] {
    const entradas = (fixture.componentInstance as unknown as Record<string, () => unknown>)[
      'entradas'
    ]() as { etiqueta: string }[];
    return entradas.map((e) => e.etiqueta);
  }

  function cabeceraDeGrupo(fixture: ComponentFixture<App>): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('button.grupo');
  }

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('el paciente ve el grupo Citas y la entrada Tratamientos', () => {
    const fixture = montar('PACIENTE');

    expect(etiquetas(fixture)).toContain('Citas');
    expect(etiquetas(fixture)).toContain('Tratamientos');
    // «Mis citas» ya no es una entrada suelta: cuelga del grupo.
    expect(etiquetas(fixture)).not.toContain('Mis citas');
  });

  it('los demas roles no ven ni el grupo ni Tratamientos', async () => {
    // La entrada se oculta porque el guard responderia que no; verlas y que al
    // pulsarlas mandaran a /sin-permiso seria un fallo de diseno.
    const fixture = await montarEn('ODONTOLOGO', '/bloqueos');

    expect(etiquetas(fixture)).not.toContain('Citas');
    expect(etiquetas(fixture)).not.toContain('Tratamientos');
    expect(cabeceraDeGrupo(fixture)).toBeNull();
  });

  it('el odontologo no ve Disponibilidad y el paciente si', async () => {
    // Consultar franjas es el paso previo a reservarlas, y el odontologo no
    // reserva: lo que ocupa su jornada lo ve en la agenda. La entrada se quita
    // en vez de dejarla llevar a una parrilla que solo puede mirar.
    const delOdontologo = await montarEn('ODONTOLOGO', '/bloqueos');
    expect(etiquetas(delOdontologo)).not.toContain('Disponibilidad');
    expect(etiquetas(delOdontologo)).toContain('Bloqueos de agenda');

    TestBed.resetTestingModule();
    expect(etiquetas(montar('PACIENTE'))).toContain('Disponibilidad');
  });

  it('el grupo arranca cerrado y sus hijos no estan en el DOM', async () => {
    // Plegado tiene que ser fuera del DOM: oculto con CSS seguiria en el
    // recorrido del tabulador.
    const fixture = await montarEn('PACIENTE', '/mis-tratamientos');

    expect(cabeceraDeGrupo(fixture)?.getAttribute('aria-expanded')).toBe('false');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('a.hijo')).toHaveLength(0);
  });

  it('al pulsar el grupo se despliegan sus hijos', async () => {
    const fixture = await montarEn('PACIENTE', '/mis-tratamientos');

    cabeceraDeGrupo(fixture)?.click();
    fixture.detectChanges();

    expect(cabeceraDeGrupo(fixture)?.getAttribute('aria-expanded')).toBe('true');
    const hijos = (fixture.nativeElement as HTMLElement).querySelectorAll('a.hijo');
    expect([...hijos].map((h) => h.textContent?.trim())).toEqual(['Mis citas', 'Historial']);
  });

  it('al entrar directo al historial el grupo aparece abierto', async () => {
    // Por recarga o por un enlace: el menu plegado contradiria a la pantalla.
    const fixture = montar('PACIENTE');

    await TestBed.inject(Router).navigateByUrl('/mis-citas/historial');
    TestBed.tick();
    fixture.detectChanges();

    expect(cabeceraDeGrupo(fixture)?.getAttribute('aria-expanded')).toBe('true');
  });
});
