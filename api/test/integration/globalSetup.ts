import { execSync } from 'child_process';
import path from 'path';

/**
 * Prepara la BD de pruebas en los contenedores de docker compose:
 *  1. Aplica las migraciones de Prisma sobre `libroclaro_test` (la crea si no existe).
 *  2. Ejecuta el seed (materias, niveles escolares y editor inicial).
 *
 * Requiere que `postgres` y `mongo` de docker compose estén arriba
 * (`npm run test:db:up`).
 */
export default async function globalSetup(): Promise<void> {
  const apiRoot = path.resolve(__dirname, '..', '..');

  const DATABASE_URL =
    process.env.DATABASE_URL ??
    'postgresql://libroclaro:libroclaro@localhost:5432/libroclaro_test?schema=public';
  const MONGO_URL =
    process.env.MONGO_URL ??
    'mongodb://libroclaro:libroclaro@localhost:27017/libroclaro_test?authSource=admin';

  const childEnv = { ...process.env, DATABASE_URL, MONGO_URL };

  // eslint-disable-next-line no-console
  console.log('\n[integration] Aplicando migraciones de Prisma sobre libroclaro_test...');
  execSync('npx prisma migrate deploy', { cwd: apiRoot, env: childEnv, stdio: 'inherit' });

  // eslint-disable-next-line no-console
  console.log('[integration] Ejecutando seed...');
  execSync('npx tsx prisma/seed.ts', { cwd: apiRoot, env: childEnv, stdio: 'inherit' });
}
