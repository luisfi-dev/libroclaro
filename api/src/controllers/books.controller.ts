import fs from 'fs/promises';
import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, SubscriptionPlan, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';
import {
  bookAnnotatedPath,
  bookCoverPath,
  bookPdfPath,
  safeUnlink,
} from '../services/storage.service';
import { buildAnnotatedPdf, generateCoverPng, getPageCount } from '../services/pdf.service';
import { serializeBook } from '../utils/serializers';

const createBookSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, 'Formato esperado: 2023-2024'),
  subjectId: z.string().uuid(),
  gradeLevelId: z.string().uuid(),
});

const updateBookSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().min(1).max(5000).optional(),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/).optional(),
  subjectId: z.string().uuid().optional(),
  gradeLevelId: z.string().uuid().optional(),
  hidden: z.boolean().optional(),
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  subjectId: z.string().uuid().optional(),
  gradeLevelId: z.string().uuid().optional(),
  schoolYear: z.string().optional(),
  includeHidden: z.coerce.boolean().optional(),
});

export async function listBooks(req: Request, res: Response): Promise<void> {
  const params = listQuerySchema.parse(req.query);
  const isEditor = req.user?.role === UserRole.EDITOR;

  const where: Prisma.BookWhereInput = {};
  if (!isEditor || !params.includeHidden) where.hidden = false;
  if (params.subjectId) where.subjectId = params.subjectId;
  if (params.gradeLevelId) where.gradeLevelId = params.gradeLevelId;
  if (params.schoolYear) where.schoolYear = params.schoolYear;
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: 'insensitive' } },
      { description: { contains: params.q, mode: 'insensitive' } },
      { subject: { name: { contains: params.q, mode: 'insensitive' } } },
      { gradeLevel: { name: { contains: params.q, mode: 'insensitive' } } },
      { schoolYear: { contains: params.q, mode: 'insensitive' } },
    ];
  }

  const books = await prisma.book.findMany({
    where,
    include: { subject: true, gradeLevel: true },
    orderBy: [{ gradeLevel: { order: 'asc' } }, { title: 'asc' }],
  });

  res.json({ books: books.map(serializeBook) });
}

export async function getBook(req: Request, res: Response): Promise<void> {
  const book = await prisma.book.findUnique({
    where: { id: req.params.id },
    include: { subject: true, gradeLevel: true },
  });
  if (!book) throw HttpError.notFound('Libro no encontrado');
  if (book.hidden && req.user?.role !== UserRole.EDITOR) {
    throw HttpError.notFound('Libro no encontrado');
  }
  res.json({ book: serializeBook(book) });
}

export async function createBook(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  if (!req.file) throw HttpError.badRequest('Debes adjuntar un archivo PDF (campo "pdf")');

  const data = createBookSchema.parse(req.body);

  const [subject, grade] = await Promise.all([
    prisma.subject.findUnique({ where: { id: data.subjectId } }),
    prisma.gradeLevel.findUnique({ where: { id: data.gradeLevelId } }),
  ]);
  if (!subject) throw HttpError.badRequest('Materia inexistente');
  if (!grade) throw HttpError.badRequest('Nivel escolar inexistente');

  const book = await prisma.book.create({
    data: {
      title: data.title,
      description: data.description,
      schoolYear: data.schoolYear,
      subjectId: data.subjectId,
      gradeLevelId: data.gradeLevelId,
      createdById: req.user.id,
      pdfPath: '',
      hidden: true,
    },
  });

  const pdfPath = bookPdfPath(book.id);
  const coverPath = bookCoverPath(book.id);
  await fs.writeFile(pdfPath, req.file.buffer);

  let pageCount = 0;
  try {
    pageCount = await getPageCount(pdfPath);
  } catch (err) {
    console.warn('No se pudo determinar pageCount:', err);
  }

  await generateCoverPng(pdfPath, coverPath, book.title);

  const updated = await prisma.book.update({
    where: { id: book.id },
    data: { pdfPath, coverPath, pageCount },
    include: { subject: true, gradeLevel: true },
  });

  res.status(201).json({ book: serializeBook(updated) });
}

export async function updateBook(req: Request, res: Response): Promise<void> {
  const data = updateBookSchema.parse(req.body);
  const book = await prisma.book.update({
    where: { id: req.params.id },
    data,
    include: { subject: true, gradeLevel: true },
  });
  // Invalida el PDF anotado cacheado
  await safeUnlink(bookAnnotatedPath(book.id));
  res.json({ book: serializeBook(book) });
}

export async function deleteBook(req: Request, res: Response): Promise<void> {
  const book = await prisma.book.findUnique({ where: { id: req.params.id } });
  if (!book) throw HttpError.notFound('Libro no encontrado');
  await prisma.book.delete({ where: { id: book.id } });
  await Promise.all([
    safeUnlink(bookPdfPath(book.id)),
    safeUnlink(bookCoverPath(book.id)),
    safeUnlink(bookAnnotatedPath(book.id)),
  ]);
  res.status(204).end();
}

export async function getBookCover(req: Request, res: Response): Promise<void> {
  const book = await prisma.book.findUnique({ where: { id: req.params.id } });
  if (!book || (book.hidden && req.user?.role !== UserRole.EDITOR)) {
    throw HttpError.notFound('Portada no disponible');
  }
  if (!book.coverPath) throw HttpError.notFound('Portada no generada');
  res.sendFile(book.coverPath);
}

export async function downloadBookPdf(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const annotated = req.query.annotated === 'true';
  const book = await prisma.book.findUnique({ where: { id: req.params.id } });
  if (!book || (book.hidden && req.user.role !== UserRole.EDITOR)) {
    throw HttpError.notFound('Libro no encontrado');
  }

  if (!annotated) {
    res.download(book.pdfPath, `${book.title}.pdf`);
    return;
  }

  if (req.user.plan === SubscriptionPlan.GRATUITO && req.user.role !== UserRole.EDITOR) {
    throw HttpError.payment(
      'La descarga con anotaciones integradas requiere el plan Pro o Institucional',
    );
  }

  const outPath = bookAnnotatedPath(book.id);
  let needsBuild = true;
  try {
    const [src, dst] = await Promise.all([fs.stat(book.pdfPath), fs.stat(outPath)]);
    needsBuild = dst.mtimeMs < src.mtimeMs;
  } catch {
    needsBuild = true;
  }

  if (needsBuild) {
    const annotations = await prisma.annotation.findMany({
      where: { bookId: book.id },
      orderBy: [{ page: 'asc' }, { y: 'asc' }],
    });
    await buildAnnotatedPdf(
      book.pdfPath,
      outPath,
      annotations.map((a) => ({
        page: a.page,
        kind: a.kind,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        content: a.content,
      })),
    );
  }

  res.download(outPath, `${book.title} (anotado).pdf`);
}
