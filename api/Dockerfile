# --- Etapa de build ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Dependencias del sistema necesarias para sharp y pdf2pic (GraphicsMagick + Ghostscript)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    graphicsmagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund --registry=https://registry.yarnpkg.com
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Etapa de runtime ---
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    graphicsmagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev --no-audit --no-fund --registry=https://registry.yarnpkg.com
RUN npx prisma generate

COPY --from=build /app/dist ./dist

RUN mkdir -p storage/books storage/covers storage/annotated

EXPOSE 4000
# Las migraciones se ejecutan manualmente con `npx prisma migrate deploy`.
CMD ["node", "dist/server.js"]
