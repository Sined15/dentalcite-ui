import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './app';


const ANCHO_ESCRITORIO = '(min-width: 56.25rem)';

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

  cambiarA(esEscritorio: boolean): void {
    this.estado.next({
      matches: esEscritorio,
      breakpoints: { [ANCHO_ESCRITORIO]: esEscritorio },
    });
  }
}

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

  function montar(esEscritorio: boolean): void {
    localStorage.setItem('dentalcite.token', sesion('ADMINISTRADOR'));
    observador = new BreakpointObserverFalso();
    observador.cambiarA(esEscritorio);

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
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

    (componente()['cajonAbierto'] as unknown as { set: (v: boolean) => void }).set(true);
    TestBed.tick();

    await TestBed.inject(Router).navigateByUrl('/usuarios');
    TestBed.tick();

    expect(componente()['cajonAbierto']()).toBe(false);
  });
});

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
    const fixture = montar();

    await TestBed.inject(Router).navigateByUrl('/perfil');
    TestBed.tick();

    expect(muestraShell(fixture)).toBe(true);
  });
});

describe('App · menu del paciente', () => {
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
    expect(etiquetas(fixture)).not.toContain('Mis citas');
  });

  it('los demas roles no ven ni el grupo ni Tratamientos', async () => {
    const fixture = await montarEn('ODONTOLOGO', '/bloqueos');

    expect(etiquetas(fixture)).not.toContain('Citas');
    expect(etiquetas(fixture)).not.toContain('Tratamientos');
    expect(cabeceraDeGrupo(fixture)).toBeNull();
  });

  it('el odontologo no ve Disponibilidad y el paciente si', async () => {
    const delOdontologo = await montarEn('ODONTOLOGO', '/bloqueos');
    expect(etiquetas(delOdontologo)).not.toContain('Disponibilidad');
    expect(etiquetas(delOdontologo)).toContain('Bloqueos de agenda');

    TestBed.resetTestingModule();
    expect(etiquetas(montar('PACIENTE'))).toContain('Disponibilidad');
  });

  it('el grupo arranca cerrado y sus hijos no estan en el DOM', async () => {
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
    const fixture = montar('PACIENTE');

    await TestBed.inject(Router).navigateByUrl('/mis-citas/historial');
    TestBed.tick();
    fixture.detectChanges();

    expect(cabeceraDeGrupo(fixture)?.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('App · entrada marcada en el menu del personal', () => {
  async function montarEn(rol: string, ruta: string): Promise<ComponentFixture<App>> {
    localStorage.setItem('dentalcite.token', sesion(rol));
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'citas', children: [] },
          { path: 'citas/pendientes', children: [] },
          { path: 'pacientes', children: [] },
          { path: 'pacientes/:id', children: [] },
          { path: '**', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: new BreakpointObserverFalso() },
      ],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(ruta);
    fixture.detectChanges();
    // routerLinkActive decide su estado en una microtarea posterior al pintado del menu.
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function marcadas(fixture: ComponentFixture<App>): string[] {
    const activas = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'a.mdc-list-item--activated',
    );
    return [...activas].map((a) => a.textContent?.trim() ?? '');
  }

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  for (const [rol, agenda] of [
    ['ODONTOLOGO', 'Mi agenda'],
    ['RECEPCIONISTA', 'Agenda'],
    ['ADMINISTRADOR', 'Agenda'],
  ] as const) {
    it(`en Por cerrar el ${rol.toLowerCase()} solo ve marcada esa entrada`, async () => {
      const fixture = await montarEn(rol, '/citas/pendientes');

      expect(marcadas(fixture)).toHaveLength(1);
      expect(marcadas(fixture)[0]).toContain('Por cerrar');
      expect(marcadas(fixture)[0]).not.toContain(agenda);
    });
  }

  it('en la agenda solo se marca la agenda', async () => {
    const fixture = await montarEn('ODONTOLOGO', '/citas');

    expect(marcadas(fixture)).toHaveLength(1);
    expect(marcadas(fixture)[0]).toContain('Mi agenda');
  });

  it('la ficha de un paciente sigue marcando Pacientes', async () => {
    const fixture = await montarEn('RECEPCIONISTA', '/pacientes/42');

    expect(marcadas(fixture)).toHaveLength(1);
    expect(marcadas(fixture)[0]).toContain('Pacientes');
  });
});
