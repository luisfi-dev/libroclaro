import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import 'express-async-errors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import institutionsRoutes from './routes/institutions.routes';
import booksRoutes from './routes/books.routes';
import catalogRoutes from './routes/catalog.routes';
import annotationsRoutes, { bookAnnotationsRouter } from './routes/annotations.routes';
import materialsRoutes, { bookMaterialsRouter } from './routes/materials.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import editorsRoutes from './routes/editors.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en un minuto.' },
  });
  app.use('/api/auth/login', loginLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'libroclaro-api', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/institutions', institutionsRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/books', booksRoutes);
  app.use('/api/books/:bookId/annotations', bookAnnotationsRouter);
  app.use('/api/books/:bookId/materials', bookMaterialsRouter);
  app.use('/api/annotations', annotationsRoutes);
  app.use('/api/materials', materialsRoutes);
  app.use('/api/subscriptions', subscriptionsRoutes);
  app.use('/api/editors', editorsRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado' });
  });

  app.use(errorHandler);

  return app;
}
