import { Request, Response } from 'express';
import { z } from 'zod';

jest.mock('../../src/config/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { errorHandler } from '../../src/middleware/errorHandler';
import { HttpError } from '../../src/utils/HttpError';

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const req = {} as Request;
const next = jest.fn();

describe('errorHandler', () => {
  it('mapea HttpError a su status y mensaje', () => {
    const res = mockRes();
    errorHandler(HttpError.forbidden('Prohibido'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Prohibido', details: undefined });
  });

  it('mapea ZodError a 400 con fieldErrors', () => {
    const res = mockRes();
    const schema = z.object({ email: z.string().email() });
    let zerr: unknown;
    try {
      schema.parse({ email: 'no-es-email' });
    } catch (e) {
      zerr = e;
    }
    errorHandler(zerr, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toBe('Datos inválidos');
    expect(payload.details.email).toBeDefined();
  });

  it('mapea errores desconocidos a 500 sin filtrar el detalle interno', () => {
    const res = mockRes();
    errorHandler(new Error('detalle interno secreto'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});
