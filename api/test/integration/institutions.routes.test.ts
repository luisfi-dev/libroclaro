import request from 'supertest';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { createUser, createInstitutionAdmin } from '../helpers/db';

const app = createApp();

describe('Panel de institución', () => {
  it('el admin renombra su institución', async () => {
    const { token } = await createInstitutionAdmin('Escuela Vieja');
    const res = await request(app)
      .patch('/api/institutions/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Escuela Nueva' });
    expect(res.status).toBe(200);
    expect(res.body.institution.name).toBe('Escuela Nueva');
  });

  it('el admin crea un miembro docente con plan PRO', async () => {
    const { token } = await createInstitutionAdmin();
    const res = await request(app)
      .post('/api/institutions/me/members')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Docente Miembro',
        email: 'miembro@test.com',
        birthDate: '1990-05-05',
        password: 'Password123',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.plan).toBe('PRO');
    expect(res.body.user.institutionId).toBeDefined();
  });

  it('el admin añade un docente existente a la institución', async () => {
    const { token, institution } = await createInstitutionAdmin();
    const docente = await createUser({ email: 'existente@test.com', role: UserRole.DOCENTE });
    const res = await request(app)
      .post('/api/institutions/me/members/existing')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'existente@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.user.institutionId).toBe(institution.id);
    void docente;
  });

  it('un docente normal no accede al panel de institución (403)', async () => {
    const docente = await createUser();
    const res = await request(app)
      .get('/api/institutions/me')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(403);
  });

  it('el admin lista, edita y elimina miembros', async () => {
    const { token, institution } = await createInstitutionAdmin();
    const miembro = await createUser({
      email: 'm@test.com',
      role: UserRole.DOCENTE,
      plan: SubscriptionPlan.PRO,
      institutionId: institution.id,
    });

    const list = await request(app)
      .get('/api/institutions/me/members')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    // El admin también pertenece a la institución, por lo que aparece junto al miembro.
    const emails = list.body.members.map((m: { id: string }) => m.id);
    expect(emails).toContain(miembro.user.id);

    const edit = await request(app)
      .patch(`/api/institutions/me/members/${miembro.user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Miembro Editado' });
    expect(edit.status).toBe(200);
    expect(edit.body.user.fullName).toBe('Miembro Editado');

    const del = await request(app)
      .delete(`/api/institutions/me/members/${miembro.user.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  it('devuelve la institución del admin (getMine)', async () => {
    const { token, institution } = await createInstitutionAdmin('Mi Insti');
    const res = await request(app)
      .get('/api/institutions/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.institution.id).toBe(institution.id);
  });
});

describe('Bloqueo de perfil para docentes institucionales (OWASP A01)', () => {
  it('un docente que pertenece a una institución NO puede editar su propio perfil (403)', async () => {
    const { institution } = await createInstitutionAdmin();
    const docente = await createUser({
      role: UserRole.DOCENTE,
      plan: SubscriptionPlan.PRO,
      institutionId: institution.id,
    });
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ fullName: 'Nuevo Nombre' });
    expect(res.status).toBe(403);
  });

  it('un docente que pertenece a una institución NO puede eliminar su cuenta (403)', async () => {
    const { institution } = await createInstitutionAdmin();
    const docente = await createUser({
      role: UserRole.DOCENTE,
      plan: SubscriptionPlan.PRO,
      institutionId: institution.id,
    });
    const res = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(403);
  });

  it('un docente sin institución SÍ puede editar su propio perfil', async () => {
    const docente = await createUser({ role: UserRole.DOCENTE, institutionId: null });
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ fullName: 'Nombre Editado' });
    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe('Nombre Editado');
  });
});
