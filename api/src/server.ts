import { env } from './config/env';
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
    console.log(`API de LibroClaro escuchando en http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\nRecibida señal ${signal}, cerrando...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Error fatal al iniciar:', err);
  process.exit(1);
});
