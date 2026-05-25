import { Request, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';
import { hashPassword, isAtLeast18 } from '../services/auth.service';
import { serializeUser } from '../utils/serializers';

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  email: z.string().email().toLowerCase().optional(),
  birthDate: z.string().optional(),
  password: z.string().min(8).max(128).optional(),
});

async function assertUserCanEditSelf(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw HttpError.notFound('Usuario no encontrado');
  if (user.role === UserRole.DOCENTE && user.institutionId) {
    throw HttpError.forbidden(
      'Los docentes que pertenecen a una institución no pueden editar sus propios datos. Contacta al administrador de tu institución.',
    );
  }
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  await assertUserCanEditSelf(req.user.id);

  const data = updateProfileSchema.parse(req.body);
  const updateData: Record<string, unknown> = {};

  if (data.fullName) updateData.fullName = data.fullName;
  if (data.email) {
    const other = await prisma.user.findUnique({ where: { email: data.email } });
    if (other && other.id !== req.user.id) {
      throw HttpError.conflict('Ya existe un usuario con ese correo');
    }
    updateData.email = data.email;
  }
  if (data.birthDate) {
    const bd = new Date(data.birthDate);
    if (isNaN(bd.getTime())) throw HttpError.badRequest('Fecha de nacimiento inválida');
    if (!isAtLeast18(bd)) throw HttpError.badRequest('Debes tener al menos 18 años');
    updateData.birthDate = bd;
  }
  if (data.password) updateData.passwordHash = await hashPassword(data.password);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
  });

  res.json({ user: serializeUser(user) });
}

export async function deleteMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  await assertUserCanEditSelf(req.user.id);

  // Si es admin de una institución, también se elimina la institución (cascade lo cubre).
  await prisma.user.delete({ where: { id: req.user.id } });
  res.status(204).end();
}
