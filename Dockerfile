# Cliente Angular de DentalCite. Dos etapas: se compila con Node y se sirve el
# resultado estatico con nginx, para que la imagen final no arrastre el
# toolchain de build.

FROM node:24-alpine AS build
WORKDIR /app

# Las dependencias se copian primero para que su capa se reutilice mientras el
# manifiesto no cambie: editar codigo no reinstala node_modules.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

# Angular emite en dist/<proyecto>/browser desde el constructor de aplicacion.
COPY --from=build /app/dist/dentalcite-ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q --spider http://localhost/ || exit 1
