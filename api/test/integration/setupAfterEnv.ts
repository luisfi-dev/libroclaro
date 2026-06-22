import { connectMongo } from '../../src/config/mongo';
import { ensureStorageDirs } from '../../src/services/storage.service';
import { prisma, mongoose, resetDb } from '../helpers/db';

// Conexión a las BD reales (docker) una vez por archivo de pruebas.
beforeAll(async () => {
  await prisma.$connect();
  if (mongoose.connection.readyState === 0) {
    await connectMongo();
  }
  // createApp() no crea los directorios de almacenamiento (eso lo hace server.ts).
  await ensureStorageDirs();
  await resetDb();
});

// Estado limpio entre cada test.
afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
  await mongoose.disconnect();
});
