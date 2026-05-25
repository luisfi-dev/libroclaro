import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';

const subjectSchema = z.object({ name: z.string().min(2).max(100) });
const gradeSchema = z.object({ name: z.string().min(1).max(50), order: z.coerce.number().int() });

export async function listSubjects(_req: Request, res: Response): Promise<void> {
  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
  res.json({ subjects });
}

export async function createSubject(req: Request, res: Response): Promise<void> {
  const data = subjectSchema.parse(req.body);
  const subject = await prisma.subject.create({ data });
  res.status(201).json({ subject });
}

export async function listGradeLevels(_req: Request, res: Response): Promise<void> {
  const grades = await prisma.gradeLevel.findMany({ orderBy: { order: 'asc' } });
  res.json({ gradeLevels: grades });
}

export async function createGradeLevel(req: Request, res: Response): Promise<void> {
  const data = gradeSchema.parse(req.body);
  const grade = await prisma.gradeLevel.create({ data });
  res.status(201).json({ gradeLevel: grade });
}
