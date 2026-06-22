import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { createUser } from '../helpers/db';

const app = createApp();

describe('Catálogo (materias y niveles)', () => {
  it('lista las materias semilla', async () => {
    const docente = await createUser();
    const res = await request(app)
      .get('/api/catalog/subjects')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(200);
    expect(res.body.subjects.length).toBeGreaterThan(0);
  });

  it('lista los niveles escolares ordenados', async () => {
    const docente = await createUser();
    const res = await request(app)
      .get('/api/catalog/grade-levels')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(200);
    expect(res.body.gradeLevels.length).toBeGreaterThan(0);
  });

  it('un editor crea una materia nueva', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    // Nombre único: Subject/GradeLevel son semilla y no se truncan entre corridas.
    const name = `Robótica ${Date.now()}`;
    const res = await request(app)
      .post('/api/catalog/subjects')
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ name });
    expect(res.status).toBe(201);
    expect(res.body.subject.name).toBe(name);
  });

  it('un editor crea un nivel escolar nuevo', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const order = 1000 + Math.floor(Math.random() * 1_000_000);
    const res = await request(app)
      .post('/api/catalog/grade-levels')
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ name: `Nivel ${order}`, order });
    expect(res.status).toBe(201);
    expect(res.body.gradeLevel.order).toBe(order);
  });

  it('un docente no puede crear materias (403)', async () => {
    const docente = await createUser();
    const res = await request(app)
      .post('/api/catalog/subjects')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(403);
  });
});
