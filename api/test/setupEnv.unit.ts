/**
 * Variables de entorno para la suite UNITARIA.
 * Se ejecuta como `setupFiles` (antes de cargar cualquier módulo de `src/`),
 * porque `src/config/env.ts` valida con Zod y hace `process.exit(1)` si faltan.
 * Aquí NO hay BD real: Prisma y Mongoose se mockean en cada test.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-libroclaro-unit-1234567890';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.MONGO_URL = process.env.MONGO_URL ?? 'mongodb://test:test@localhost:27017/test?authSource=admin';
process.env.STORAGE_DIR = process.env.STORAGE_DIR ?? './storage-test';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
