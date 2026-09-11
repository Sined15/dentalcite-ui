/**
 * Auditoría de accesibilidad (RNF-08).
 *
 * RNF-08 exige cinco criterios AA de WCAG 2.1 sobre las pantallas del alcance:
 * contraste (1.4.3), texto alternativo (1.1.1), navegación por teclado (2.1.1),
 * foco visible (2.4.7) y etiquetado de formularios (3.3.2). Este guion cubre la
 * mitad automatizable de su instrumento de verificación; el recorrido manual
 * con teclado y lector de pantalla es la otra mitad y no se sustituye.
 *
 * Se ejecuta contra Chrome de verdad, no contra jsdom, porque el contraste
 * exige que el navegador calcule los estilos: en jsdom axe se salta esa regla,
 * que es justo uno de los cinco criterios que RNF-08 nombra.
 *
 * Requisitos: la API en :8080 y el cliente en :4200, ambos en marcha.
 *
 *   npm run a11y
 *
 * Sale con código 1 si hay alguna violación, de modo que sirve como puerta de
 * la Definición de Terminado y no solo como informe.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.API_URL ?? 'http://localhost:8080';
const UI = process.env.UI_URL ?? 'http://localhost:4200';
const PUERTO_CDP = 9222;

/** Las cuatro cuentas que Flyway siembra, todas con la misma contraseña. */
const CUENTAS = {
  ADMINISTRADOR: 'admin@dentalcite.com',
  ODONTOLOGO: 'dr.perez@dentalcite.com',
  RECEPCIONISTA: 'recepcion@dentalcite.com',
  PACIENTE: 'paciente@demo.com',
};
const PASSWORD = 'Password123';

/**
 * Pantallas del alcance construido, cada una con el rol que la alcanza. Las públicas van
 * sin rol: se visitan sin sesión, que es como las ve un visitante.
 */
const PANTALLAS = [
  // HU-06 (v4): el área pública. Van sin rol a propósito: se auditan como las ve
  // un visitante, sin sesión, que es el único estado en que su cabecera ofrece
  // iniciar sesión. Auditarlas con token mostraría otra cabecera y otra cosa.
  [null, '/'],
  [null, '/nuestras-especialidades'],
  [null, '/nuestro-equipo'],
  [null, '/login'],
  [null, '/registro'],
  ['ADMINISTRADOR', '/perfil'],
  ['ADMINISTRADOR', '/usuarios'],
  ['ADMINISTRADOR', '/usuarios/nuevo'],
  ['ADMINISTRADOR', '/especialidades'],
  ['ADMINISTRADOR', '/especialidades/nuevo'],
  ['ADMINISTRADOR', '/tratamientos'],
  ['ADMINISTRADOR', '/tratamientos/nuevo'],
  ['ADMINISTRADOR', '/odontologos'],
  ['ADMINISTRADOR', '/odontologos/nuevo'],
  ['ADMINISTRADOR', '/bloqueos'],
  ['ADMINISTRADOR', '/bloqueos/nuevo'],
  ['ODONTOLOGO', '/bloqueos'],
  // Sprint 2
  ['ADMINISTRADOR', '/disponibilidad'],
  ['PACIENTE', '/disponibilidad'],
  ['RECEPCIONISTA', '/citas'],
  // Sprint 3
  ['RECEPCIONISTA', '/pacientes'],
  ['RECEPCIONISTA', '/pacientes/nuevo'],
  // HU-14: la misma ruta que ve el paciente, pero con el selector de paciente
  // delante, que es un control mas —un combobox— y no se audita solo.
  ['RECEPCIONISTA', '/disponibilidad'],
  ['PACIENTE', '/mis-citas'],
  ['ODONTOLOGO', '/citas/pendientes'],
  ['RECEPCIONISTA', '/citas/pendientes'],
  // El menu del paciente. Aqui estaba `['PACIENTE', '/tratamientos']`, que desde
  // la revision v4 no audita lo que dice: esa ruta es el mantenimiento del
  // catalogo y el paciente acaba en /sin-permiso. Sus tratamientos son estos.
  ['PACIENTE', '/mis-tratamientos'],
  ['PACIENTE', '/mis-citas/historial'],
];

/**
 * La ficha de HU-13 necesita un identificador concreto, asi que su ruta no se
 * puede escribir en la lista de arriba: se resuelve buscando un paciente con la
 * propia API antes de auditar.
 *
 * Se devuelven dos pantallas sobre la misma ruta porque no ensenan lo mismo: la
 * seccion de planes de HU-17 solo se pinta para quien puede planificar, asi que
 * auditar unicamente la vista de recepcion la dejaria sin mirar. El
 * ADMINISTRADOR alcanza cualquier ficha y ademas planifica; el ODONTOLOGO solo
 * las de sus pacientes, y cual sea depende de los datos.
 */
async function pantallasDeFicha(tokenDeRecepcion) {
  const r = await fetch(`${API}/api/v1/pacientes?size=1`, {
    headers: { Authorization: `Bearer ${tokenDeRecepcion}` },
  });
  if (!r.ok) return [];
  const pagina = await r.json();
  const paciente = pagina.content?.[0];
  if (!paciente) return [];
  return [
    ['RECEPCIONISTA', `/pacientes/${paciente.id}`],
    ['ADMINISTRADOR', `/pacientes/${paciente.id}`],
  ];
}

/**
 * El detalle de especialidad de HU-06 también lleva identificador, así que se
 * resuelve igual que la ficha. Se pide al **catálogo público**, sin token: si
 * hiciera falta una sesión para averiguar qué auditar, la pantalla no sería
 * pública.
 */
async function pantallaDeEspecialidad() {
  const r = await fetch(`${API}/api/v1/publico/especialidades`);
  if (!r.ok) return [];
  const especialidades = await r.json();
  // La que más contenido pinta es la que más superficie da que auditar.
  const conOdontologos = especialidades.find((e) => e.nombre === 'Odontología Estética');
  const elegida = conOdontologos ?? especialidades[0];
  return elegida ? [[null, `/nuestras-especialidades/${elegida.id}`]] : [];
}

/** RNF-09 fija 360px como ancho mínimo; se audita ahí y en escritorio. */
const ANCHOS = [
  [360, 800, 'móvil'],
  [1440, 900, 'escritorio'],
];

const AXE = readFileSync(resolve(RAIZ, 'node_modules/axe-core/axe.min.js'), 'utf8');

function rutaDeChrome() {
  const candidatas = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const c of candidatas) {
    try {
      readFileSync(c);
      return c;
    } catch {
      /* siguiente candidata */
    }
  }
  throw new Error('No se encontró Chrome. Indica su ruta en CHROME_PATH.');
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarCdp() {
  for (let i = 0; i < 40; i++) {
    try {
      return await (await fetch(`http://localhost:${PUERTO_CDP}/json/version`)).json();
    } catch {
      await espera(500);
    }
  }
  throw new Error('Chrome no expuso el puerto de depuración.');
}

async function token(rol) {
  const r = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: CUENTAS[rol], password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`No se pudo iniciar sesión como ${rol}: HTTP ${r.status}`);
  return (await r.json()).token;
}

function conectar(url) {
  const ws = new WebSocket(url);
  const pendientes = new Map();
  let n = 0;
  const listo = new Promise((res) => ws.addEventListener('open', res));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendientes.has(m.id)) {
      const { res, rej } = pendientes.get(m.id);
      pendientes.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
  });
  const enviar = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const id = ++n;
      pendientes.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  return { ws, listo, enviar };
}

const chrome = spawn(rutaDeChrome(), [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${PUERTO_CDP}`,
  `--user-data-dir=${resolve(RAIZ, '.a11y-profile')}`,
  'about:blank',
]);
chrome.on('error', (e) => {
  console.error('No se pudo lanzar Chrome:', e.message);
  process.exit(2);
});

let salida = 0;
try {
  const version = await esperarCdp();
  const { ws, listo, enviar } = conectar(version.webSocketDebuggerUrl);
  await listo;

  const { targetId } = await enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await enviar('Target.attachToTarget', { targetId, flatten: true });
  const ev = (expresion) =>
    enviar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true }, sessionId);
  await enviar('Runtime.enable', {}, sessionId);
  await enviar('Page.enable', {}, sessionId);

  const tokens = {};
  for (const rol of new Set(PANTALLAS.map(([r]) => r).filter(Boolean))) {
    tokens[rol] = await token(rol);
  }

  const fichas = await pantallasDeFicha(tokens.RECEPCIONISTA);
  if (fichas.length > 0) {
    PANTALLAS.push(...fichas);
  } else {
    console.log('AVISO  no hay pacientes que auditar: se omite /pacientes/{id}');
  }

  const detalle = await pantallaDeEspecialidad();
  if (detalle.length > 0) {
    PANTALLAS.push(...detalle);
  } else {
    console.log('AVISO  el catálogo público no devolvió especialidades: se omite su detalle');
  }

  const informe = [];
  let violaciones = 0;

  for (const [ancho, alto, etiquetaAncho] of ANCHOS) {
    await enviar(
      'Emulation.setDeviceMetricsOverride',
      { width: ancho, height: alto, deviceScaleFactor: 1, mobile: ancho < 500 },
      sessionId,
    );

    for (const [rol, ruta] of PANTALLAS) {
      // La sesión se siembra desde una pantalla del propio origen, para que
      // `localStorage` sea el del cliente y no el de `about:blank`.
      await enviar('Page.navigate', { url: `${UI}/login` }, sessionId);
      await espera(900);
      await ev(
        rol
          ? `localStorage.setItem('dentalcite.token', ${JSON.stringify(tokens[rol])})`
          : `localStorage.removeItem('dentalcite.token')`,
      );
      await enviar('Page.navigate', { url: `${UI}${ruta}` }, sessionId);
      await espera(2200);

      await ev(AXE);
      const bruto = await ev(`(async () => {
        const r = await axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        });
        return JSON.stringify(r.violations.map(v => ({
          id: v.id,
          impacto: v.impact,
          descripcion: v.help,
          criterios: v.tags.filter(t => t.startsWith('wcag')),
          nodos: v.nodes.slice(0, 3).map(n => ({ objetivo: n.target.join(' '), resumen: n.failureSummary })),
          total: v.nodes.length,
        })));
      })()`);

      const fallos = JSON.parse(bruto.result.value);
      violaciones += fallos.reduce((a, v) => a + v.total, 0);
      informe.push({ rol: rol ?? 'público', ruta, ancho: etiquetaAncho, violaciones: fallos });

      const marca = fallos.length === 0 ? 'OK ' : 'FALLA';
      console.log(`${marca}  ${etiquetaAncho.padEnd(11)} ${(rol ?? 'público').padEnd(14)} ${ruta}`);
      for (const v of fallos) {
        console.log(`        · [${v.impacto}] ${v.id}: ${v.descripcion} (${v.total} nodo/s)`);
        for (const n of v.nodos) console.log(`            ${n.objetivo}`);
      }
    }
  }

  mkdirSync(resolve(RAIZ, 'informes'), { recursive: true });
  const destino = resolve(RAIZ, 'informes/accesibilidad.json');
  writeFileSync(destino, JSON.stringify({ fecha: new Date().toISOString(), informe }, null, 2));

  console.log(`\nPantallas auditadas: ${informe.length}. Nodos en falta: ${violaciones}.`);
  console.log(`Informe: ${destino}`);
  if (violaciones > 0) {
    console.error('\nRNF-08 sin cumplir: hay violaciones que corregir.');
    salida = 1;
  }

  await enviar('Target.closeTarget', { targetId });
  ws.close();
} catch (e) {
  console.error('La auditoría no pudo completarse:', e.message);
  salida = 2;
} finally {
  chrome.kill();
}

process.exit(salida);
