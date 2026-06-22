import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/HttpError';
import { logger } from '../config/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // ERROR #2: Error no manejado (500)
  const message = err instanceof Error ? err.message : 'Error desconocido';
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error('Error no manejado en el servidor', { error: message, stack });
  res.status(500).json({ error: 'Error interno del servidor' });
}
