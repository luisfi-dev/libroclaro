import { env } from './config/env';
import { logger } from './config/logger';
import { createApp } from './app';
import { prisma } from './config/prisma';
import { connectMongo } from './config/mongo';
import { ensureStorageDirs } from './services/storage.service';

async function bootstrap(): Promise<void> {
  await ensureStorageDirs();
  await prisma.$connect();
  await connectMongo();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    // INFO #1: Servidor iniciado
    logger.info('API de LibroClaro iniciada', { port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = async (signal: string) => {
    // INFO #2: Cierre controlado
    logger.info('Cierre controlado del servidor', { signal });
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  // ERROR #1: Error fatal al iniciar
  logger.error('Error fatal durante el arranque del servidor', { error: (err as Error).message });
  process.exit(1);
});
