import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { createUser } from '../helpers/db';

const app = createApp();

/**
 * Cobertura transversal OWASP A01 (Broken Access Control): un Docente no debe
 * poder llegar a las áreas de Editor ni de Administrador de institución.
 */
describe('Control de acceso por rol (OWASP A01)', () => {
  it('un docente no accede a /api/editors (403)', async () => {
    const docente = await createUser({ role: UserRole.DOCENTE });
    const res = await request(app)
      .post('/api/editors/promote')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ email: 'x@test.com' });
    expect(res.status).toBe(403);
  });

  it('un docente no accede a /api/institutions/me (403)', async () => {
    const docente = await createUser({ role: UserRole.DOCENTE });
    const res = await request(app)
      .get('/api/institutions/me')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(403);
  });

  it('cualquier endpoint protegido rechaza peticiones sin token (401)', async () => {
    expect((await request(app).get('/api/books')).status).toBe(401);
    expect((await request(app).get('/api/subscriptions/status')).status).toBe(401);
    expect((await request(app).get('/api/catalog/subjects')).status).toBe(401);
  });

  it('rechaza un token con firma inválida (401)', async () => {
    const res = await request(app)
      .get('/api/books')
      .set('Authorization', 'Bearer token.falso.invalido');
    expect(res.status).toBe(401);
  });

  it('GET /api/health responde sin autenticación', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
  });
});
