FROM node:24-alpine AS build
WORKDIR /app

ARG CONFIGURACION=production

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration=${CONFIGURACION}

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist/dentalcite-ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q --spider http://localhost/ || exit 1
