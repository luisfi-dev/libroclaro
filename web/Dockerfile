# --- Etapa de build ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
# Vite resuelve las variables VITE_* en build leyendo .env.production
# automáticamente. Edita web/.env.production para apuntar a la URL real de la API.
COPY .env.production ./

RUN npm run build

# --- Etapa de runtime ---
FROM nginx:1.27-alpine AS runtime

# Configuración SPA: sirve archivos estáticos y hace fallback a /index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
