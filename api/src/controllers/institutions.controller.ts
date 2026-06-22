import { Request, Response } from 'express';
import { z } from 'zod';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';
import { hashPassword, isAtLeast18 } from '../services/auth.service';
import { serializeInstitution, serializeUser } from '../utils/serializers';
import { logger } from '../config/logger';

const updateInstitutionSchema = z.object({
  name: z.string().min(2).max(200),
});

const createMemberSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  birthDate: z.string(),
  password: z.string().min(8).max(128),
});

const addExistingMemberSchema = z.object({
  email: z.string().email().toLowerCase(),
});

const updateMemberSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  email: z.string().email().toLowerCase().optional(),
  birthDate: z.string().optional(),
  password: z.string().min(8).max(128).optional(),
});

async function getAdminInstitution(userId: string) {
  const inst = await prisma.institution.findUnique({ where: { adminId: userId } });
  if (!inst) throw HttpError.forbidden('No eres administrador de ninguna institución');
  return inst;
}

export async function getMine(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const inst = await getAdminInstitution(req.user.id);
  res.json({ institution: serializeInstitution(inst) });
}

export async function updateMine(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const inst = await getAdminInstitution(req.user.id);
  const data = updateInstitutionSchema.parse(req.body);
  const updated = await prisma.institution.update({ where: { id: inst.id }, data });
  res.json({ institution: serializeInstitution(updated) });
}

export async function listMembers(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const inst = await getAdminInstitution(req.user.id);
  const members = await prisma.user.findMany({
    where: { institutionId: inst.id },
    orderBy: { fullName: 'asc' },
  });
  res.json({ members: members.map(serializeUser) });
}

export async function createMember(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const inst = await getAdminInstitution(req.user.id);
  const data = createMemberSchema.parse(req.body);
  const birthDate = new Date(data.birthDate);
  if (isNaN(birthDate.getTime())) throw HttpError.badRequest('Fecha inválida');
  if (!isAtLeast18(birthDate)) throw HttpError.badRequest('El usuario debe tener al menos 18 años');

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw HttpError.conflict('Ya existe un usuario con ese correo');

  const member = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      birthDate,
      passwordHash: await hashPassword(data.password),
      role: UserRole.DOCENTE,
      plan: SubscriptionPlan.PRO,
      institutionId: inst.id,
    },
  });
  // DEBUG #5: Miembro creado en institucion
  logger.debug('Miembro creado en institucion', { memberId: member.id, institutionId: inst.id });
  res.status(201).json({ user: serializeUser(member) });
}

export async function addExistingMember(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const inst = await getAdminInstitution(req.user.id);
  const data = addExistingMemberSchema.parse(req.body);

  const target = await prisma.user.findUnique({ where: { email: data.email } });
  if (!target) throw HttpError.notFound('Usuario no encontrado');
  if (target.role !== UserRole.DOCENTE) {
    throw HttpError.badRequest('Sólo se pueden añadir usuarios docentes a una institución');
  }
  if (target.institutionId) {
    throw HttpError.conflict('El usuario ya pertenece a otra institución');
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { institutionId: inst.id, plan: SubscriptionPlan.PRO },
  });
  // DEBUG #6: Miembro existente agregado a institucion
  logger.debug('Miembro existente agregado a institucion', { memberId: target.id, institutionId: inst.id });
  res.json({ user: serializeUser(updated) });
}

export async function updateMember(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const inst = await getAdminInstitution(req.user.id);
  const memberId = req.params.id;

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.institutionId !== inst.id) {
    throw HttpError.notFound('Miembro no encontrado');
  }

  const data = updateMemberSchema.parse(req.body);
  const updateData: Record<string, unknown> = {};
  if (data.fullName) updateData.fullName = data.fullName;
  if (data.email) {
    const other = await prisma.user.findUnique({ where: { email: data.email } });
    if (other && other.id !== memberId) throw HttpError.conflict('Correo en uso');
    updateData.email = data.email;
  }
  if (data.birthDate) {
    const bd = new Date(data.birthDate);
    if (isNaN(bd.getTime())) throw HttpError.badRequest('Fecha inválida');
    if (!isAtLeast18(bd)) throw HttpError.badRequest('Debe tener al menos 18 años');
    updateData.birthDate = bd;
  }
  if (data.password) updateData.passwordHash = await hashPassword(data.password);

  const updated = await prisma.user.update({ where: { id: memberId }, data: updateData });
  res.json({ user: serializeUser(updated) });
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const inst = await getAdminInstitution(req.user.id);
  const memberId = req.params.id;

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.institutionId !== inst.id) {
    throw HttpError.notFound('Miembro no encontrado');
  }
  await prisma.user.delete({ where: { id: memberId } });
  res.status(204).end();
}
