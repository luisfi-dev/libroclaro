import { Request, Response } from 'express';
import { z } from 'zod';
import { AnnotationKind, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';
import { serializeAnnotation } from '../utils/serializers';
import { safeUnlink, bookAnnotatedPath } from '../services/storage.service';
import { consumeAnnotationView, getAnnotationQuota } from '../services/quota.service';
import { logger } from '../config/logger';

const createSchema = z.object({
  page: z.coerce.number().int().positive(),
  kind: z.nativeEnum(AnnotationKind),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  content: z.string().min(1).max(10000),
});

const updateSchema = createSchema.partial();

export async function listForBook(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const { bookId } = req.params;
  const page = req.query.page ? Number(req.query.page) : undefined;

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || (book.hidden && req.user.role !== UserRole.EDITOR)) {
    throw HttpError.notFound('Libro no encontrado');
  }

  const annotations = await prisma.annotation.findMany({
    where: { bookId, ...(page ? { page } : {}) },
    orderBy: [{ page: 'asc' }, { y: 'asc' }],
  });

  // Para usuarios no editores, devuelve metadatos sin el contenido (cuyo acceso se cobra).
  const includeContent = req.user.role === UserRole.EDITOR;
  const payload = annotations.map((a) =>
    includeContent
      ? serializeAnnotation(a)
      : { ...serializeAnnotation(a), content: undefined, hasContent: true },
  );

  const quota = await getAnnotationQuota(req.user.id, req.user.plan);
  res.json({ annotations: payload, quota });
}

export async function revealAnnotation(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const annotation = await prisma.annotation.findUnique({ where: { id: req.params.id } });
  if (!annotation) throw HttpError.notFound('Anotación no encontrada');

  // Los editores ven todo sin contar cuota.
  if (req.user.role !== UserRole.EDITOR) {
    await consumeAnnotationView(req.user.id, annotation.id, req.user.plan);
  }
  const quota = await getAnnotationQuota(req.user.id, req.user.plan);
  res.json({ annotation: serializeAnnotation(annotation), quota });
}

export async function createAnnotation(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const data = createSchema.parse(req.body);
  const book = await prisma.book.findUnique({ where: { id: req.params.bookId } });
  if (!book) throw HttpError.notFound('Libro no encontrado');

  const annotation = await prisma.annotation.create({
    data: { ...data, bookId: book.id, authorId: req.user.id },
  });
  await safeUnlink(bookAnnotatedPath(book.id));
  // DEBUG #2: Anotacion creada
  logger.debug('Anotacion creada', { annotationId: annotation.id, bookId: book.id, page: data.page, kind: data.kind });
  res.status(201).json({ annotation: serializeAnnotation(annotation) });
}

export async function updateAnnotation(req: Request, res: Response): Promise<void> {
  const data = updateSchema.parse(req.body);
  const annotation = await prisma.annotation.update({
    where: { id: req.params.id },
    data,
  });
  await safeUnlink(bookAnnotatedPath(annotation.bookId));
  res.json({ annotation: serializeAnnotation(annotation) });
}

export async function deleteAnnotation(req: Request, res: Response): Promise<void> {
  const annotation = await prisma.annotation.findUnique({ where: { id: req.params.id } });
  if (!annotation) throw HttpError.notFound('Anotación no encontrada');
  await prisma.annotation.delete({ where: { id: annotation.id } });
  await safeUnlink(bookAnnotatedPath(annotation.bookId));
  // DEBUG #3: Anotacion eliminada
  logger.debug('Anotacion eliminada', { annotationId: annotation.id, bookId: annotation.bookId });
  res.status(204).end();
}
