import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { createUser, createBook, createAnnotation, seedRefs } from '../helpers/db';

const app = createApp();

async function samplePdfBuffer(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 400]);
  pdf.addPage([300, 400]);
  return Buffer.from(await pdf.save());
}

describe('GET /api/books', () => {
  it('un docente no ve libros ocultos', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser({ role: UserRole.DOCENTE });
    await createBook({ createdById: editor.user.id, hidden: true, title: 'Oculto' });
    await createBook({ createdById: editor.user.id, hidden: false, title: 'Visible' });

    const res = await request(app).get('/api/books').set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(200);
    const titles = res.body.books.map((b: { title: string }) => b.title);
    expect(titles).toContain('Visible');
    expect(titles).not.toContain('Oculto');
  });

  it('un editor ve los ocultos con includeHidden=true', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    await createBook({ createdById: editor.user.id, hidden: true, title: 'Oculto' });

    const res = await request(app)
      .get('/api/books?includeHidden=true')
      .set('Authorization', `Bearer ${editor.token}`);
    const titles = res.body.books.map((b: { title: string }) => b.title);
    expect(titles).toContain('Oculto');
  });

  it('filtra por búsqueda de texto (q)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    await createBook({ createdById: editor.user.id, title: 'Álgebra básica' });
    await createBook({ createdById: editor.user.id, title: 'Historia universal' });

    const res = await request(app)
      .get('/api/books?q=álgebra')
      .set('Authorization', `Bearer ${editor.token}`);
    const titles = res.body.books.map((b: { title: string }) => b.title);
    expect(titles).toContain('Álgebra básica');
    expect(titles).not.toContain('Historia universal');
  });
});

describe('GET /api/books/:id', () => {
  it('404 cuando un docente pide un libro oculto', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser();
    const book = await createBook({ createdById: editor.user.id, hidden: true });
    const res = await request(app)
      .get(`/api/books/${book.id}`)
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(404);
  });

  it('200 con los metadatos cuando el libro es visible', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser();
    const book = await createBook({ createdById: editor.user.id, hidden: false, title: 'Visible 2' });
    const res = await request(app)
      .get(`/api/books/${book.id}`)
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(200);
    expect(res.body.book.title).toBe('Visible 2');
  });
});

describe('DELETE /api/books/:id', () => {
  it('un editor elimina un libro', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id });
    const res = await request(app)
      .delete(`/api/books/${book.id}`)
      .set('Authorization', `Bearer ${editor.token}`);
    expect(res.status).toBe(204);
  });
});

describe('GET /api/books/:id/pdf', () => {
  it('descarga el PDF original tras subir un libro', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const refs = await seedRefs();
    const created = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${editor.token}`)
      .field('title', 'Descargable')
      .field('description', 'desc')
      .field('schoolYear', '2023-2024')
      .field('subjectId', refs.subjectId)
      .field('gradeLevelId', refs.gradeLevelId)
      .attach('pdf', await samplePdfBuffer(), 'libro.pdf');
    expect(created.status).toBe(201);

    const res = await request(app)
      .get(`/api/books/${created.body.book.id}/pdf`)
      .set('Authorization', `Bearer ${editor.token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('pdf');
  }, 30000);

  it('un docente Gratuito no puede descargar el PDF anotado (402)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const docente = await createUser();
    const book = await createBook({ createdById: editor.user.id, hidden: false });
    const res = await request(app)
      .get(`/api/books/${book.id}/pdf?annotated=true`)
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(402);
  });

  it('un editor descarga el PDF anotado generado con sus anotaciones', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const refs = await seedRefs();
    const created = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${editor.token}`)
      .field('title', 'Anotable')
      .field('description', 'desc')
      .field('schoolYear', '2023-2024')
      .field('subjectId', refs.subjectId)
      .field('gradeLevelId', refs.gradeLevelId)
      .attach('pdf', await samplePdfBuffer(), 'libro.pdf');
    await createAnnotation(created.body.book.id, editor.user.id, { content: 'Nota **anotada**' });

    const res = await request(app)
      .get(`/api/books/${created.body.book.id}/pdf?annotated=true`)
      .set('Authorization', `Bearer ${editor.token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('pdf');
  }, 30000);
});

describe('POST /api/books', () => {
  it('un docente no puede crear libros (403)', async () => {
    const docente = await createUser();
    const refs = await seedRefs();
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${docente.token}`)
      .field('title', 'Nuevo')
      .field('description', 'desc')
      .field('schoolYear', '2023-2024')
      .field('subjectId', refs.subjectId)
      .field('gradeLevelId', refs.gradeLevelId)
      .attach('pdf', await samplePdfBuffer(), 'libro.pdf');
    expect(res.status).toBe(403);
  });

  it('un editor crea un libro subiendo un PDF (multipart) y queda oculto por defecto', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const refs = await seedRefs();
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${editor.token}`)
      .field('title', 'Libro nuevo')
      .field('description', 'Una descripción')
      .field('schoolYear', '2023-2024')
      .field('subjectId', refs.subjectId)
      .field('gradeLevelId', refs.gradeLevelId)
      .attach('pdf', await samplePdfBuffer(), 'libro.pdf');
    expect(res.status).toBe(201);
    expect(res.body.book.title).toBe('Libro nuevo');
    expect(res.body.book.hidden).toBe(true);
    expect(res.body.book.pageCount).toBe(2);
  }, 30000);

  it('rechaza un archivo que no es PDF (400)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const refs = await seedRefs();
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${editor.token}`)
      .field('title', 'X')
      .field('description', 'x')
      .field('schoolYear', '2023-2024')
      .field('subjectId', refs.subjectId)
      .field('gradeLevelId', refs.gradeLevelId)
      .attach('pdf', Buffer.from('no soy pdf'), 'archivo.txt');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/books/:id (publicar/ocultar)', () => {
  it('un editor puede publicar un libro oculto', async () => {
    const editor = await createUser({ role: UserRole.EDITOR });
    const book = await createBook({ createdById: editor.user.id, hidden: true });
    const res = await request(app)
      .patch(`/api/books/${book.id}`)
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ hidden: false });
    expect(res.status).toBe(200);
    expect(res.body.book.hidden).toBe(false);
  });
});

// Limpieza de archivos generados por createBook en el storage de prueba.
afterAll(async () => {
  await fs.rm(path.join(process.cwd(), 'storage-test'), { recursive: true, force: true }).catch(() => {});
  void os;
});
