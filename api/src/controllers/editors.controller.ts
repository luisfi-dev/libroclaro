import { Request, Response } from 'express';
import { z } from 'zod';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';
import { hashPassword, isAtLeast18 } from '../services/auth.service';
import { serializeUser } from '../utils/serializers';
import { logger } from '../config/logger';

const createEditorSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  birthDate: z.string(),
  password: z.string().min(8).max(128),
});

const promoteSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export async function createEditor(req: Request, res: Response): Promise<void> {
  const data = createEditorSchema.parse(req.body);
  const birthDate = new Date(data.birthDate);
  if (isNaN(birthDate.getTime())) throw HttpError.badRequest('Fecha inválida');
  if (!isAtLeast18(birthDate)) throw HttpError.badRequest('Debe tener al menos 18 años');

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw HttpError.conflict('Ya existe un usuario con ese correo');

  const editor = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      birthDate,
      passwordHash: await hashPassword(data.password),
      role: UserRole.EDITOR,
      plan: SubscriptionPlan.PRO,
    },
  });
  res.status(201).json({ user: serializeUser(editor) });
}

export async function promoteToEditor(req: Request, res: Response): Promise<void> {
  const data = promoteSchema.parse(req.body);
  const target = await prisma.user.findUnique({ where: { email: data.email } });
  if (!target) throw HttpError.notFound('Usuario no encontrado');
  if (target.role === UserRole.EDITOR) throw HttpError.badRequest('Ya es editor');
  if (target.institutionId || target.role === UserRole.ADMIN_INSTITUCION) {
    throw HttpError.badRequest(
      'Sólo se pueden promover docentes no institucionales a editores',
    );
  }
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role: UserRole.EDITOR, plan: SubscriptionPlan.PRO, institutionId: null },
  });
  // DEBUG #7: Usuario promovido a editor
  logger.debug('Usuario promovido a editor', { userId: target.id });
  res.json({ user: serializeUser(updated) });
}
