import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectMongo(): Promise<void> {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGO_URL);
    // INFO #3: MongoDB conectado
    logger.info('MongoDB conectado correctamente');
  } catch (err) {
    // ERROR #4: Fallo de conexion a MongoDB
    logger.error('Fallo al conectar a MongoDB', { error: (err as Error).message });
    throw err;
  }
}

export { mongoose };
