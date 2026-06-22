import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';
import { comparePassword, hashPassword, isAtLeast18, signToken } from '../services/auth.service';
import { serializeUser } from '../utils/serializers';
import { logger } from '../config/logger';

const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  birthDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Fecha inválida'),
  password: z.string().min(8).max(128),
  passwordConfirmation: z.string().min(8).max(128),
}).refine((d) => d.password === d.passwordConfirmation, {
  path: ['passwordConfirmation'],
  message: 'Las contraseñas no coinciden',
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response): Promise<void> {
  const data = registerSchema.parse(req.body);
  const birthDate = new Date(data.birthDate);

  if (!isAtLeast18(birthDate)) {
    // WARN #2: Registro rechazado por edad insuficiente
    logger.warn('Registro rechazado: usuario menor de 18 anios');
    throw HttpError.badRequest('Debes tener al menos 18 años para registrarte');
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw HttpError.conflict('Ya existe un usuario con ese correo');

  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      birthDate,
      passwordHash: await hashPassword(data.password),
    },
  });

  const token = signToken(user);
  // INFO #4: Nuevo usuario registrado
  logger.info('Nuevo usuario registrado', { userId: user.id, role: 'DOCENTE' });
  res.status(201).json({ token, user: serializeUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    // WARN #3: Intento de login con credenciales invalidas
    logger.warn('Intento de login fallido: credenciales invalidas');
    throw HttpError.unauthorized('Credenciales inválidas');
  }

  const ok = await comparePassword(data.password, user.passwordHash);
  if (!ok) {
    logger.warn('Intento de login fallido: credenciales invalidas');
    throw HttpError.unauthorized('Credenciales inválidas');
  }

  const token = signToken(user);
  // INFO #5: Inicio de sesion exitoso
  logger.info('Inicio de sesion exitoso', { userId: user.id, role: user.role });
  res.json({ token, user: serializeUser(user) });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw HttpError.notFound('Usuario no encontrado');
  res.json({ user: serializeUser(user) });
}
