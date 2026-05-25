# LibroClaro

Plataforma web de libros de texto SEP con correcciones verificadas, material
complementario y suscripciones simuladas.

## Estructura del repositorio

```
libroclaro/
├── api/                  # API Express + TypeScript (Prisma/Postgres + Mongoose/Mongo)
├── web/                  # Front-end React + Vite + TypeScript (MUI + react-pdf)
├── docker-compose.yaml   # Postgres + MongoDB + API
└── CLAUDE.md             # Especificación del proyecto
```

Cada subproyecto tiene su propio `README.md` con detalle. Lo siguiente cubre el
arranque de todo el sistema en local.

## Stack

- **API**: Express + TypeScript, Prisma + PostgreSQL, Mongoose + MongoDB,
  JWT/bcrypt, Multer, pdf-lib + sharp + pdf2pic.
- **Web**: React 18 + Vite + TypeScript, MUI v6, TanStack Query, axios,
  React Router, react-pdf.
- **Infra**: Docker Compose (Postgres, Mongo, API). Imagen
  `luisfidev/libroclaro:latest`.

## Arranque local

### 1. Levantar las bases de datos y la API

```bash
docker compose up -d postgres mongo
# Primera vez: aplicar migraciones y seed
docker compose run --rm api sh -c "npx prisma migrate deploy && npm run seed"
# Levantar la API
docker compose up -d api
```

API disponible en `http://localhost:4000/api`.

> Si prefieres correr la API fuera de Docker (modo `npm run dev`), ve a
> [api/README.md](api/README.md).

Editor de pruebas creado por el seed:

- **Correo:** `editor@libroclaro.test`
- **Contraseña:** `editor1234`

### 2. Levantar el front-end

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Web disponible en `http://localhost:5173`. Vite hace proxy de `/api/*` a
`http://localhost:4000` (configurable con `VITE_API_PROXY`).

## Pantallas del front-end

| Ruta | Acceso | Descripción |
| --- | --- | --- |
| `/login`, `/register` | Pública | Auth con validación de ≥18 años |
| `/` | Autenticado | Catálogo con buscador y filtros (materia, grado, ciclo) |
| `/books/:id` | Autenticado | Detalle del libro con portada y metadatos |
| `/books/:id/read` | Autenticado | Lector PDF, hover de anotaciones, material por página, descarga |
| `/profile` | Autenticado | Editar datos / eliminar cuenta (bloqueado para docentes institucionales) |
| `/subscriptions` | Autenticado | Comparativa de planes y checkout simulado |
| `/subscriptions/invoices` | Autenticado | Historial de facturas |
| `/editor` | EDITOR | Listado de libros con subida, publicar/ocultar, eliminar, gestión de editores |
| `/editor/books/:id` | EDITOR | Editor de anotaciones (drag para dibujar) y de material complementario |
| `/institution` | ADMIN_INSTITUCION | Renombrar institución, crear/añadir/editar/eliminar miembros |

### Flujo de anotaciones

- En el **lector** (docentes/admin): al pasar el mouse sobre un área resaltada,
  se llama a `GET /api/annotations/:id/reveal` y aparece el contenido en un
  tooltip. Para plan Gratuito, cada vista única descuenta de la cuota mensual
  (20 por mes); el progreso se muestra en la cabecera.
- En el **editor**: el botón "Añadir anotación" activa modo dibujo; al arrastrar
  un rectángulo se abre un diálogo con tipo (Error / Error parcial) y editor
  Markdown (con vista previa que conserva los marcadores `**`, `*`, etc.).
- El PDF anotado se descarga desde el lector con el botón "Anotado"
  (requiere Pro / Institucional).

## Comandos útiles

| Comando | Descripción |
| --- | --- |
| `docker compose up -d` | Levantar Postgres + Mongo + API |
| `docker compose logs -f api` | Ver logs de la API |
| `docker compose run --rm api npm run seed` | Re-sembrar materias/niveles/editor |
| `cd api && npm run dev` | API en modo watch (fuera de Docker) |
| `cd api && npm run prisma:studio` | Explorador visual de la BD |
| `cd web && npm run dev` | Front-end en modo dev |
| `cd web && npm run build` | Build de producción del front |

## Variables de entorno

### API ([api/.env.example](api/.env.example))

```
PORT=4000
JWT_SECRET=...
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://libroclaro:libroclaro@localhost:5432/libroclaro?schema=public
MONGO_URL=mongodb://libroclaro:libroclaro@localhost:27017/libroclaro?authSource=admin
STORAGE_DIR=./storage
CORS_ORIGIN=http://localhost:5173
```

### Web ([web/.env.example](web/.env.example))

```
VITE_API_URL=             # En blanco usa rutas relativas (Vite proxy)
VITE_API_PROXY=http://localhost:4000
```

Para apuntar el front a una API remota en build de producción:

```bash
VITE_API_URL=https://api.libroclaro.example npm run build
```

## Publicar la imagen Docker

```bash
docker build -t luisfidev/libroclaro:latest ./api
docker push luisfidev/libroclaro:latest
```
