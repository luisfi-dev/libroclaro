import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

jest.mock('../../src/config/prisma', () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));
jest.mock('../../src/config/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { prisma } from '../../src/config/prisma';
import { authenticate, requireRole } from '../../src/middleware/auth';
import { signToken } from '../../src/services/auth.service';
import { HttpError } from '../../src/utils/HttpError';

const findUnique = prisma.user.findUnique as jest.Mock;

function mockReqRes(headers: Record<string, string> = {}) {
  const req = { headers, path: '/test' } as unknown as Request;
  const res = {} as Response;
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => jest.clearAllMocks());

describe('authenticate', () => {
  it('rechaza cuando no hay header Authorization', async () => {
    const { req, res, next } = mockReqRes();
    await authenticate(req, res, next);
    const err = next.mock.calls[0][0] as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(401);
  });

  it('rechaza cuando el token es inválido', async () => {
    const { req, res, next } = mockReqRes({ authorization: 'Bearer token-falso' });
    await authenticate(req, res, next);
    const err = next.mock.calls[0][0] as HttpError;
    expect(err.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rechaza cuando el usuario del token ya no existe', async () => {
    findUnique.mockResolvedValue(null);
    const token = signToken({ id: 'no-existe', email: 'x@y.com' });
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });
    await authenticate(req, res, next);
    const err = next.mock.calls[0][0] as HttpError;
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/no encontrado/i);
  });

  it('asigna req.user y llama next() sin error con token válido', async () => {
    const dbUser = {
      id: 'u1',
      email: 'u1@y.com',
      role: UserRole.DOCENTE,
      plan: 'GRATUITO',
      institutionId: null,
    };
    findUnique.mockResolvedValue(dbUser);
    const token = signToken({ id: 'u1', email: 'u1@y.com' });
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(dbUser);
  });
});

describe('requireRole', () => {
  it('rechaza con 401 cuando no hay usuario autenticado', () => {
    const { req, res, next } = mockReqRes();
    requireRole(UserRole.EDITOR)(req, res, next);
    expect((next.mock.calls[0][0] as HttpError).status).toBe(401);
  });

  it('rechaza con 403 cuando el rol no está permitido (anti-escalamiento)', () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: 'u1', email: 'd@x.com', role: UserRole.DOCENTE, plan: 'GRATUITO', institutionId: null } as never;
    requireRole(UserRole.EDITOR)(req, res, next);
    expect((next.mock.calls[0][0] as HttpError).status).toBe(403);
  });

  it('permite continuar cuando el rol coincide', () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: 'u1', email: 'e@x.com', role: UserRole.EDITOR, plan: 'PRO', institutionId: null } as never;
    requireRole(UserRole.EDITOR, UserRole.ADMIN_INSTITUCION)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
