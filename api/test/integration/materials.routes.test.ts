import request from 'supertest';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { createUser, createBook, SupplementaryMaterial } from '../helpers/db';

const app = createApp();

async function seedMaterial(bookId: string, authorId: string, overrides: Record<string, unknown> = {}) {
  return SupplementaryMaterial.create({
    bookId,
    authorId,
    fromPage: 1,
    toPage: 3,
    title: 'Video de apoyo',
    content: 'Mira este **video** complementario.',
    ...overrides,
  });
}

describe('Material complementario (MongoDB)', () => {
  it('un editor crea material para un libro', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id });
    const res = await request(app)
      .post(`/api/books/${book.id}/materials`)
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ fromPage: 2, toPage: 5, title: 'Actividad', content: 'Resuelve los ejercicios.' });
    expect(res.status).toBe(201);
    expect(res.body.material.title).toBe('Actividad');
  });

  it('rechaza toPage menor que fromPage (400)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id });
    const res = await request(app)
      .post(`/api/books/${book.id}/materials`)
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ fromPage: 5, toPage: 2, title: 'Mala', content: 'x' });
    expect(res.status).toBe(400);
  });

  it('filtra material por rango de páginas (page dentro de fromPage..toPage)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id });
    await seedMaterial(book.id, editor.user.id, { fromPage: 1, toPage: 3, title: 'A' });
    await seedMaterial(book.id, editor.user.id, { fromPage: 10, toPage: 12, title: 'B' });

    const res = await request(app)
      .get(`/api/books/${book.id}/materials?page=2`)
      .set('Authorization', `Bearer ${editor.token}`);
    const titles = res.body.materials.map((m: { title: string }) => m.title);
    expect(titles).toContain('A');
    expect(titles).not.toContain('B');
  });

  it('un docente del plan Gratuito ve el material bloqueado (sin contenido)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    const book = await createBook({ createdById: editor.user.id });
    await seedMaterial(book.id, editor.user.id);

    const res = await request(app)
      .get(`/api/books/${book.id}/materials`)
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(200);
    expect(res.body.materials[0].locked).toBe(true);
    expect(res.body.materials[0].content).toBeUndefined();
  });

  it('un docente Pro ve el contenido completo', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser({ plan: SubscriptionPlan.PRO });
    const book = await createBook({ createdById: editor.user.id });
    await seedMaterial(book.id, editor.user.id);

    const res = await request(app)
      .get(`/api/books/${book.id}/materials`)
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.body.materials[0].content).toContain('video');
  });

  it('un docente Gratuito no puede ver un material por id (402)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    const book = await createBook({ createdById: editor.user.id });
    const mat = await seedMaterial(book.id, editor.user.id);
    const res = await request(app)
      .get(`/api/materials/${mat._id.toString()}`)
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(402);
  });

  it('un editor obtiene, edita y elimina un material por id', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id });
    const mat = await seedMaterial(book.id, editor.user.id);
    const id = mat._id.toString();

    const get = await request(app)
      .get(`/api/materials/${id}`)
      .set('Authorization', `Bearer ${editor.token}`);
    expect(get.status).toBe(200);

    const patch = await request(app)
      .patch(`/api/materials/${id}`)
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ title: 'Título editado' });
    expect(patch.status).toBe(200);
    expect(patch.body.material.title).toBe('Título editado');

    const del = await request(app)
      .delete(`/api/materials/${id}`)
      .set('Authorization', `Bearer ${editor.token}`);
    expect(del.status).toBe(204);
  });
});
