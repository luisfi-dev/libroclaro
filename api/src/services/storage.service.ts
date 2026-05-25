import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

export const STORAGE_ROOT = path.resolve(process.cwd(), env.STORAGE_DIR);
export const BOOKS_DIR = path.join(STORAGE_ROOT, 'books');
export const COVERS_DIR = path.join(STORAGE_ROOT, 'covers');
export const ANNOTATED_DIR = path.join(STORAGE_ROOT, 'annotated');

export async function ensureStorageDirs(): Promise<void> {
  await Promise.all([
    fs.mkdir(BOOKS_DIR, { recursive: true }),
    fs.mkdir(COVERS_DIR, { recursive: true }),
    fs.mkdir(ANNOTATED_DIR, { recursive: true }),
  ]);
}

export function bookPdfPath(bookId: string): string {
  return path.join(BOOKS_DIR, `${bookId}.pdf`);
}

export function bookCoverPath(bookId: string): string {
  return path.join(COVERS_DIR, `${bookId}.png`);
}

export function bookAnnotatedPath(bookId: string): string {
  return path.join(ANNOTATED_DIR, `${bookId}.pdf`);
}

export async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}
