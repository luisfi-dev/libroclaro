import { Request, Response } from 'express';
import { z } from 'zod';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';
import { SupplementaryMaterial, serializeMaterial } from '../models/SupplementaryMaterial';
import { logger } from '../config/logger';

const createSchema = z.object({
  fromPage: z.coerce.number().int().positive(),
  toPage: z.coerce.number().int().positive(),
  title: z.string().min(1).max(300),
  content: z.string().min(1),
});

const updateSchema = createSchema.partial();

function ensureMaterialAccess(req: Request): void {
  if (!req.user) throw HttpError.unauthorized();
  if (req.user.role === UserRole.EDITOR) return;
  if (req.user.plan === SubscriptionPlan.GRATUITO) {
    // WARN #6: Usuario gratuito intento acceder a material premium
    logger.warn('Acceso denegado a material complementario: plan gratuito', { userId: req.user.id });
    throw HttpError.payment(
      'El acceso al material complementario requiere el plan Pro o Institucional',
    );
  }
}

export async function listForBook(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const { bookId } = req.params;
  const page = req.query.page ? Number(req.query.page) : undefined;

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || (book.hidden && req.user.role !== UserRole.EDITOR)) {
    throw HttpError.notFound('Libro no encontrado');
  }

  const filter: Record<string, unknown> = { bookId };
  if (page) {
    filter.fromPage = { $lte: page };
    filter.toPage = { $gte: page };
  }

  // Para usuarios sin acceso, devolvemos solo los títulos como teaser.
  const canRead =
    req.user.role === UserRole.EDITOR || req.user.plan !== SubscriptionPlan.GRATUITO;

  const items = await SupplementaryMaterial.find(filter).sort({ fromPage: 1 });
  const payload = items.map((doc) => {
    const data = serializeMaterial(doc);
    if (!canRead) return { ...data, content: undefined, locked: true };
    return data;
  });
  res.json({ materials: payload });
}

export async function getById(req: Request, res: Response): Promise<void> {
  ensureMaterialAccess(req);
  const doc = await SupplementaryMaterial.findById(req.params.id);
  if (!doc) throw HttpError.notFound('Material no encontrado');
  res.json({ material: serializeMaterial(doc) });
}

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const data = createSchema.parse(req.body);
  if (data.toPage < data.fromPage) {
    throw HttpError.badRequest('toPage no puede ser menor que fromPage');
  }
  const book = await prisma.book.findUnique({ where: { id: req.params.bookId } });
  if (!book) throw HttpError.notFound('Libro no encontrado');

  const doc = await SupplementaryMaterial.create({
    ...data,
    bookId: book.id,
    authorId: req.user.id,
  });
  // DEBUG #4: Material complementario creado
  logger.debug('Material complementario creado', { materialId: doc._id, bookId: book.id, fromPage: data.fromPage, toPage: data.toPage });
  res.status(201).json({ material: serializeMaterial(doc) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const data = updateSchema.parse(req.body);
  if (data.fromPage && data.toPage && data.toPage < data.fromPage) {
    throw HttpError.badRequest('toPage no puede ser menor que fromPage');
  }
  const doc = await SupplementaryMaterial.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!doc) throw HttpError.notFound('Material no encontrado');
  res.json({ material: serializeMaterial(doc) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const doc = await SupplementaryMaterial.findByIdAndDelete(req.params.id);
  if (!doc) throw HttpError.notFound('Material no encontrado');
  res.status(204).end();
}
