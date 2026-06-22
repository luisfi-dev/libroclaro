import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { createUser } from '../helpers/db';

const app = createApp();

describe('PATCH /api/auth/me (perfil)', () => {
  it('actualiza nombre, email y contraseña de un docente no institucional', async () => {
    const docente = await createUser({ email: 'perfil@test.com' });
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ fullName: 'Nombre Nuevo', email: 'nuevo@test.com', password: 'NuevaPass123' });
    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe('Nombre Nuevo');
    expect(res.body.user.email).toBe('nuevo@test.com');
  });

  it('rechaza cambiar a un email ya en uso (409)', async () => {
    await createUser({ email: 'ocupado@test.com' });
    const docente = await createUser({ email: 'libre@test.com' });
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ email: 'ocupado@test.com' });
    expect(res.status).toBe(409);
  });

  it('rechaza una fecha de nacimiento de menor de edad (400)', async () => {
    const docente = await createUser();
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ birthDate: '2015-01-01' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/auth/me (eliminar cuenta)', () => {
  it('un docente no institucional elimina su propia cuenta', async () => {
    const docente = await createUser({ role: UserRole.DOCENTE });
    const res = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(204);
    // El token ya no resuelve a un usuario existente
    const after = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(after.status).toBe(401);
  });
});
