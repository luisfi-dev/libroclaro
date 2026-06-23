/**
 * Variables de entorno para la suite de INTEGRACIÓN.
 * Apuntan a los contenedores Postgres y Mongo de `docker compose`, pero a BD
 * SEPARADAS (`libroclaro_test`) para no tocar los datos de desarrollo.
 * Las credenciales coinciden con las del docker-compose.yaml (libroclaro/libroclaro).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-libroclaro-integration-1234567890';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://libroclaro:libroclaro@localhost:5432/libroclaro_test?schema=public';
process.env.MONGO_URL =
  process.env.MONGO_URL ??
  'mongodb://libroclaro:libroclaro@localhost:27017/libroclaro_test?authSource=admin';
process.env.STORAGE_DIR = process.env.STORAGE_DIR ?? './storage-test';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

// Sin telemetría en pruebas: no inicializar Application Insights.
process.env.APPINSIGHTS_CONNECTION_STRING = '';
