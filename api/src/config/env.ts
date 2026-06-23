import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET debe tener al menos 10 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z.string().url(),
  MONGO_URL: z.string().url(),
  STORAGE_DIR: z.string().default('./storage'),
  CORS_ORIGIN: z.string().default('*'),
  APPINSIGHTS_CONNECTION_STRING: z.string(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
