import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';

interface JwtPayload {
  sub: string;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw HttpError.unauthorized('Token no proporcionado');

    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, plan: true, institutionId: true },
    });

    if (!user) throw HttpError.unauthorized('Usuario no encontrado');

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(HttpError.unauthorized('Token inválido o expirado'));
      return;
    }
    next(err);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(HttpError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(HttpError.forbidden('Tu rol no tiene permisos para esta acción'));
      return;
    }
    next();
  };
}
