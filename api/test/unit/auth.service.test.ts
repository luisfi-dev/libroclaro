import jwt from 'jsonwebtoken';
import {
  hashPassword,
  comparePassword,
  signToken,
  isAtLeast18,
  SALT_ROUNDS,
} from '../../src/services/auth.service';
import { env } from '../../src/config/env';

describe('auth.service', () => {
  describe('hashPassword / comparePassword', () => {
    it('genera un hash distinto del texto plano y verificable', async () => {
      const hash = await hashPassword('supersecreta');
      expect(hash).not.toBe('supersecreta');
      expect(hash.length).toBeGreaterThan(20);
      expect(await comparePassword('supersecreta', hash)).toBe(true);
    });

    it('comparePassword devuelve false con contraseña incorrecta', async () => {
      const hash = await hashPassword('correcta');
      expect(await comparePassword('incorrecta', hash)).toBe(false);
    });

    it('usa 10 salt rounds', () => {
      expect(SALT_ROUNDS).toBe(10);
    });
  });

  describe('signToken', () => {
    it('firma un JWT con el email en el payload y el id como subject', () => {
      const token = signToken({ id: 'user-123', email: 'a@b.com' });
      const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('a@b.com');
      expect(decoded.exp).toBeDefined();
    });

    it('produce un token inválido con otro secreto', () => {
      const token = signToken({ id: 'x', email: 'x@y.com' });
      expect(() => jwt.verify(token, 'otro-secreto-distinto')).toThrow();
    });
  });

  describe('isAtLeast18', () => {
    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-21T12:00:00Z'));
    });
    afterAll(() => {
      jest.useRealTimers();
    });

    // Construimos las fechas con componentes locales (mes 0-indexado) para evitar
    // el corrimiento de día por parseo en UTC.
    it('true cuando cumple exactamente 18 años hoy', () => {
      expect(isAtLeast18(new Date(2008, 5, 21))).toBe(true);
    });

    it('false cuando cumple 18 mañana', () => {
      expect(isAtLeast18(new Date(2008, 5, 22))).toBe(false);
    });

    it('true para un adulto mayor de edad', () => {
      expect(isAtLeast18(new Date(1990, 0, 1))).toBe(true);
    });

    it('false para un menor evidente', () => {
      expect(isAtLeast18(new Date(2015, 0, 1))).toBe(false);
    });
  });
});
