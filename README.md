# DentalCite — Cliente (Angular)

Portal web de la clínica: Angular 22 con Angular Material, componentes *standalone*,
detección de cambios sin zona (señales) y la interfaz en español (`es-PE`).

La API vive en el repositorio hermano `../dentalcite`. **Este repositorio no la
levanta**: hay que arrancarla allí antes de usar el cliente contra datos reales.

## 🚀 Puesta en marcha

```bash
npm install
npm start        # ng serve -> http://localhost:4200
```

En desarrollo el cliente apunta a `http://localhost:8080`
(`src/environments/environment.development.ts`); la construcción de producción usa
`src/environments/environment.ts`, que apunta al despliegue de Render. Si cambias
el puerto de la API, cámbialo ahí y no en los servicios.

> El puerto **4200 no es negociable**: es el único origen que admite el CORS de la
> API por defecto (`CORS_ALLOWED_ORIGINS`).

Credenciales de demostración (las siembra Flyway al arrancar la API): las cuatro
usan la contraseña `Password123` y hay una por rol — `admin@dentalcite.com`,
`recepcion@dentalcite.com`, `dr.perez@dentalcite.com` y `paciente@demo.com`.

### Con Docker

```bash
docker compose up --build     # sirve el bundle en nginx, en el 4200
```

## 🧪 Comprobaciones

```bash
npm test          # Vitest (no Karma)
npm run lint      # ESLint + angular-eslint
npm run a11y      # axe-core sobre Chrome, a 360 px y en escritorio
npm run build     # construcción de producción, a dist/
```

`npm run a11y` recorre las pantallas de cada rol y escribe el resultado en
`informes/accesibilidad.json`. Los dos anchos son deliberados: RNF-08 fija el nivel
AA de WCAG 2.1 y **RNF-09 fija 360 px** como ancho mínimo utilizable, así que una
pantalla nueva no está terminada hasta que aparece en
`scripts/auditar-accesibilidad.mjs` y sale sin violaciones.

La API tiene que estar levantada para que la auditoría pueda iniciar sesión.

## 🗺 Cómo está organizado

No hay módulos por funcionalidad: la estructura es plana por capas y todo es
*standalone*.

```
src/app/
  app.routes.ts      todas las rutas, con loadComponent y rolGuard
  core/
    auth/            sesión, interceptor de JWT, guardas de rol y de contraseña
    http/            forma de la página de Spring Data y traducción de errores
  components/        una carpeta por pantalla
  models/            los tipos de la API, reexportados por models/index.ts
  services/          uno por recurso; cada uno compone su URL con environment.apiUrl
  shared/            piezas reutilizables (diálogo de confirmación, paginado)
```

Tres convenciones que conviene no romper:

- **Las horas viajan como cadenas**, nunca como `Date`. `fecha` es `"YYYY-MM-DD"` y
  `hora` es `"HH:mm:ss"`, en hora local de la clínica y ancladas por `zonaHoraria`.
  Convertirlas a `Date` las desplazaría al huso del navegador, que es justo lo que
  la API evita al no mandar instantes.
- **Un filtro vacío no se manda.** Para el servidor, un parámetro en blanco no
  significa «todos»: se omite.
- **Una acción que el rol no puede ejercer no se pinta como botón.** Un botón que
  devuelve 403 al pulsarlo es un fallo de diseño, no una barrera; el permiso se
  comprueba antes de renderizar.

## 📋 Alcance

Las historias de usuario y el plan del proyecto están en el repositorio del
servidor, en `../dentalcite/docs/`. La Definición de Terminado se separa por
repositorio: aquí una historia está terminada cuando sus pruebas pasan, sus
pantallas son responsivas y accesibles (RNF-08, RNF-09) y sus criterios de
interfaz están en verde.
