/**
 * No se elimina la BD de pruebas para permitir inspección posterior con
 * Prisma Studio. El estado se limpia entre tests con resetDb() (ver test/helpers/db.ts).
 */
export default async function globalTeardown(): Promise<void> {
  // no-op
}
