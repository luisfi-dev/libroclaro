import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { createUser } from '../helpers/db';

const app = createApp();

describe('Gestión de editores', () => {
  it('un editor crea otro editor', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const res = await request(app)
      .post('/api/editors')
      .set('Authorization', `Bearer ${editor.token}`)
      .send({
        fullName: 'Nuevo Editor',
        email: 'nuevoeditor@test.com',
        birthDate: '1985-03-03',
        password: 'Password123',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('EDITOR');
    expect(res.body.user.plan).toBe('PRO');
  });

  it('un editor promueve a un docente no institucional', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    await createUser({ email: 'asciende@test.com', role: UserRole.DOCENTE });
    const res = await request(app)
      .post('/api/editors/promote')
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ email: 'asciende@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('EDITOR');
  });

  it('un docente no puede acceder a la gestión de editores (403)', async () => {
    const docente = await createUser();
    const res = await request(app)
      .post('/api/editors')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({
        fullName: 'X',
        email: 'x@test.com',
        birthDate: '1985-03-03',
        password: 'Password123',
      });
    expect(res.status).toBe(403);
  });

  it('rechaza promover a alguien que ya es editor (400)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    await createUser({ email: 'yaeditor@test.com', role: UserRole.EDITOR });
    const res = await request(app)
      .post('/api/editors/promote')
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ email: 'yaeditor@test.com' });
    expect(res.status).toBe(400);
  });
});
