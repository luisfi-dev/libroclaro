import request from 'supertest';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { createUser, createBook, createAnnotation } from '../helpers/db';

const app = createApp();

describe('GET /api/annotations/:id/reveal (cuota Free)', () => {
  it('descuenta la cuota del plan Gratuito al revelar', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    const book = await createBook({ createdById: editor.user.id });
    const ann = await createAnnotation(book.id, editor.user.id);

    const res = await request(app)
      .get(`/api/annotations/${ann.id}/reveal`)
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(200);
    expect(res.body.annotation.content).toBeDefined();
    expect(res.body.quota.used).toBe(1);
    expect(res.body.quota.remaining).toBe(19);
  });

  it('al alcanzar el límite de 20 responde 402', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    const book = await createBook({ createdById: editor.user.id });

    // Crea 21 anotaciones y revela 20 (límite), la 21 debe fallar con 402.
    const annotations = [];
    for (let i = 0; i < 21; i++) {
      annotations.push(await createAnnotation(book.id, editor.user.id, { page: i + 1 }));
    }
    for (let i = 0; i < 20; i++) {
      const r = await request(app)
        .get(`/api/annotations/${annotations[i].id}/reveal`)
        .set('Authorization', `Bearer ${docente.token}`);
      expect(r.status).toBe(200);
    }
    const last = await request(app)
      .get(`/api/annotations/${annotations[20].id}/reveal`)
      .set('Authorization', `Bearer ${docente.token}`);
    expect(last.status).toBe(402);
  }, 30000);

  it('un editor revela sin consumir cuota (ilimitado)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id });
    const ann = await createAnnotation(book.id, editor.user.id);
    const res = await request(app)
      .get(`/api/annotations/${ann.id}/reveal`)
      .set('Authorization', `Bearer ${editor.token}`);
    expect(res.status).toBe(200);
    expect(res.body.quota.unlimited).toBe(true);
  });
});

describe('Listado de anotaciones por libro', () => {
  it('para un docente NO incluye el contenido (solo metadatos)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    const book = await createBook({ createdById: editor.user.id });
    await createAnnotation(book.id, editor.user.id);

    const res = await request(app)
      .get(`/api/books/${book.id}/annotations`)
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(200);
    expect(res.body.annotations[0].content).toBeUndefined();
    expect(res.body.annotations[0].hasContent).toBe(true);
  });

  it('un editor crea una anotación; un docente no puede (403)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser();
    const book = await createBook({ createdById: editor.user.id });

    const ok = await request(app)
      .post(`/api/books/${book.id}/annotations`)
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ page: 1, kind: 'ERROR', x: 0.1, y: 0.1, width: 0.2, height: 0.05, content: 'texto' });
    expect(ok.status).toBe(201);

    const forbidden = await request(app)
      .post(`/api/books/${book.id}/annotations`)
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ page: 1, kind: 'ERROR', x: 0.1, y: 0.1, width: 0.2, height: 0.05, content: 'texto' });
    expect(forbidden.status).toBe(403);
  });

  it('rechaza coordenadas fuera de rango 0..1 (validación Zod 400)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id });
    const res = await request(app)
      .post(`/api/books/${book.id}/annotations`)
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ page: 1, kind: 'ERROR', x: 1.5, y: 0.1, width: 0.2, height: 0.05, content: 'texto' });
    expect(res.status).toBe(400);
  });
});

describe('Edición y borrado de anotaciones (editor)', () => {
  it('un editor edita el contenido de una anotación', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id });
    const ann = await createAnnotation(book.id, editor.user.id);
    const res = await request(app)
      .patch(`/api/annotations/${ann.id}`)
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ content: 'Contenido corregido', kind: 'ERROR_PARCIAL' });
    expect(res.status).toBe(200);
    expect(res.body.annotation.content).toBe('Contenido corregido');
    expect(res.body.annotation.kind).toBe('ERROR_PARCIAL');
  });

  it('un editor elimina una anotación', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id });
    const ann = await createAnnotation(book.id, editor.user.id);
    const res = await request(app)
      .delete(`/api/annotations/${ann.id}`)
      .set('Authorization', `Bearer ${editor.token}`);
    expect(res.status).toBe(204);
  });

  it('404 al revelar una anotación inexistente', async () => {
    const docente = await createUser();
    const res = await request(app)
      .get('/api/annotations/00000000-0000-0000-0000-000000000000/reveal')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(404);
  });
});
