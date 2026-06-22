import path from 'path';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import fs from 'fs/promises';
import {
  bookPdfPath,
  bookCoverPath,
  bookAnnotatedPath,
  ensureStorageDirs,
  safeUnlink,
  BOOKS_DIR,
  COVERS_DIR,
  ANNOTATED_DIR,
} from '../../src/services/storage.service';

const mkdirMock = fs.mkdir as jest.Mock;
const unlinkMock = fs.unlink as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('rutas de archivos', () => {
  it('bookPdfPath apunta al directorio de libros con extensión .pdf', () => {
    expect(bookPdfPath('abc')).toBe(path.join(BOOKS_DIR, 'abc.pdf'));
  });
  it('bookCoverPath apunta al directorio de portadas con extensión .png', () => {
    expect(bookCoverPath('abc')).toBe(path.join(COVERS_DIR, 'abc.png'));
  });
  it('bookAnnotatedPath apunta al directorio de anotados con extensión .pdf', () => {
    expect(bookAnnotatedPath('abc')).toBe(path.join(ANNOTATED_DIR, 'abc.pdf'));
  });
});

describe('ensureStorageDirs', () => {
  it('crea los tres directorios de forma recursiva', async () => {
    await ensureStorageDirs();
    expect(mkdirMock).toHaveBeenCalledWith(BOOKS_DIR, { recursive: true });
    expect(mkdirMock).toHaveBeenCalledWith(COVERS_DIR, { recursive: true });
    expect(mkdirMock).toHaveBeenCalledWith(ANNOTATED_DIR, { recursive: true });
  });
});

describe('safeUnlink', () => {
  it('elimina el archivo normalmente', async () => {
    await safeUnlink('/tmp/x.pdf');
    expect(unlinkMock).toHaveBeenCalledWith('/tmp/x.pdf');
  });

  it('ignora el error ENOENT (archivo inexistente)', async () => {
    unlinkMock.mockRejectedValueOnce(Object.assign(new Error('no existe'), { code: 'ENOENT' }));
    await expect(safeUnlink('/tmp/falta.pdf')).resolves.toBeUndefined();
  });

  it('re-lanza otros errores de E/S', async () => {
    unlinkMock.mockRejectedValueOnce(Object.assign(new Error('permiso'), { code: 'EACCES' }));
    await expect(safeUnlink('/tmp/x.pdf')).rejects.toThrow('permiso');
  });
});
