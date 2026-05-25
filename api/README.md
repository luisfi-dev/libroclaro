# LibroClaro API

API REST de LibroClaro: catálogo de libros de la SEP con correcciones verificadas,
material complementario y suscripciones simuladas.

## Stack

- **Node.js + Express + TypeScript**
- **Prisma + PostgreSQL** (usuarios, instituciones, libros, materias, niveles,
  anotaciones, facturación)
- **Mongoose + MongoDB** (material complementario)
- **JWT + bcryptjs** (autenticación)
- **Multer** (subida de PDFs)
- **pdf-lib + sharp + pdf2pic** (portadas PNG y PDFs anotados)

## Estructura

```
api/
├── prisma/
│   ├── schema.prisma     # Esquema de la BD relacional
│   └── seed.ts           # Materias, niveles y editor inicial
├── src/
│   ├── config/           # env, prisma, mongo
│   ├── controllers/      # Lógica HTTP
│   ├── middleware/       # auth, errores, uploads
│   ├── models/           # Modelos Mongoose
│   ├── routes/           # Rutas Express
│   ├── services/         # Lógica de negocio (auth, pdf, storage, cuota)
│   ├── utils/            # HttpError, serializers, asyncHandler
│   ├── app.ts            # Configuración del app Express
│   └── server.ts         # Bootstrap del servidor
├── storage/              # PDFs y portadas (volumen Docker)
├── Dockerfile
└── package.json
```

## Desarrollo local

```bash
# 1. Levantar las BDs
cd ..
docker compose up -d postgres mongo

# 2. Instalar y configurar
cd api
cp .env.example .env
npm install

# 3. Migrar y sembrar
npm run prisma:migrate -- --name init
npm run seed

# 4. Arrancar en modo watch
npm run dev
```

API en `http://localhost:4000`. Editor inicial: `editor@libroclaro.test / editor1234`.

## Despliegue con Docker

```bash
docker compose up --build
```

Esto levanta Postgres, MongoDB y la API (imagen `luisfidev/libroclaro:latest`).
La API ejecuta `prisma migrate deploy` al arrancar.

Publicar la imagen:

```bash
docker build -t luisfidev/libroclaro:latest ./api
docker push luisfidev/libroclaro:latest
```

## Endpoints principales

Todas las rutas viven bajo `/api`. Las autenticadas requieren
`Authorization: Bearer <token>`.

### Auth (`/api/auth`)

| Método | Ruta         | Descripción                                       |
| ------ | ------------ | ------------------------------------------------- |
| POST   | `/register`  | Registra un nuevo docente (≥18 años)              |
| POST   | `/login`     | Login con email + contraseña → token JWT          |
| GET    | `/me`        | Perfil del usuario autenticado                    |
| PATCH  | `/me`        | Editar datos propios (bloqueado para institucionales) |
| DELETE | `/me`        | Eliminar cuenta propia (bloqueado para institucionales) |

### Catálogo (`/api/catalog`)

- `GET /subjects`, `POST /subjects` (editor)
- `GET /grade-levels`, `POST /grade-levels` (editor)

### Libros (`/api/books`)

- `GET /` con filtros `?q=&subjectId=&gradeLevelId=&schoolYear=&includeHidden=`
- `GET /:id` y `GET /:id/cover` (PNG)
- `GET /:id/pdf?annotated=true|false` (descarga; anotado requiere plan Pro/Inst.)
- `POST /` (editor, `multipart/form-data` con campo `pdf` y metadatos)
- `PATCH /:id`, `DELETE /:id` (editor)

### Anotaciones

- `GET /api/books/:bookId/annotations?page=N` — lista metadatos
- `POST /api/books/:bookId/annotations` (editor)
- `GET /api/annotations/:id/reveal` — devuelve el contenido y descuenta cuota
- `PATCH /api/annotations/:id`, `DELETE /api/annotations/:id` (editor)

Las coordenadas (`x, y, width, height`) son normalizadas en el rango `0..1`
relativas a la página.

### Material complementario

- `GET /api/books/:bookId/materials?page=N`
- `POST /api/books/:bookId/materials` (editor)
- `GET /api/materials/:id`, `PATCH /api/materials/:id`, `DELETE /api/materials/:id`

### Instituciones (`/api/institutions`)

Sólo administradores de institución.

- `GET /me`, `PATCH /me`
- `GET /me/members`
- `POST /me/members` — crear nuevo docente miembro
- `POST /me/members/existing` — añadir un docente existente por email
- `PATCH /me/members/:id`, `DELETE /me/members/:id`

### Suscripciones (`/api/subscriptions`)

- `GET /status` — plan, rol y cuota mensual de correcciones
- `POST /subscribe` — body `{ plan, institutionName?, cardNumber, cardHolder, cardExpiry, cardCvc }`
  - `GRATUITO`: sin tarjeta, no permitido para miembros institucionales
  - `PRO`: $100/mes
  - `INSTITUCIONAL`: $2500/mes, crea la institución y promueve a admin
- `GET /invoices` — facturas del usuario

### Editores (`/api/editors`)

Sólo editores.

- `POST /` — crea otro editor
- `POST /promote` `{ email }` — convierte a un docente no institucional en editor

## Planes y cuotas

| Plan          | Precio    | Correcciones/mes | Material | PDF anotado |
| ------------- | --------- | ---------------- | -------- | ----------- |
| Gratuito      | $0        | 20               | No       | No          |
| Pro           | $100/mes  | Ilimitadas       | Sí       | Sí          |
| Institucional | $2500/mes | Ilimitadas       | Sí       | Sí          |

La cuota se cuenta por `AnnotationView`: revelar el mismo contenido dos veces en el
mismo mes cuenta una sola vez.

## Notas

- El payload de pago es simulado: se valida el formato y se guarda únicamente los
  últimos 4 dígitos de la tarjeta en la factura.
- Las portadas requieren GraphicsMagick + Ghostscript (incluidos en la imagen
  Docker). En su ausencia se genera un placeholder con `sharp`.
- El PDF anotado se cachea en `storage/annotated/` y se invalida al editar
  anotaciones o el libro.
