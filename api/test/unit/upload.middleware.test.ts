import { Request } from 'express';
import { uploadPdf } from '../../src/middleware/upload';
import { HttpError } from '../../src/utils/HttpError';

/**
 * Probamos directamente el `fileFilter` de Multer, que es la lógica de negocio
 * relevante (solo se aceptan PDFs).
 */
function getFileFilter() {
  // multer expone la config en la instancia; accedemos al fileFilter usado.
  return (uploadPdf as unknown as { fileFilter: (req: Request, file: Express.Multer.File, cb: (err: unknown, accept?: boolean) => void) => void }).fileFilter;
}

function fakeFile(mimetype: string): Express.Multer.File {
  return { mimetype, originalname: 'doc', fieldname: 'pdf' } as Express.Multer.File;
}

describe('uploadPdf fileFilter', () => {
  it('acepta archivos application/pdf', (done) => {
    const filter = getFileFilter();
    filter({} as Request, fakeFile('application/pdf'), (err: unknown, accept?: boolean) => {
      expect(err).toBeNull();
      expect(accept).toBe(true);
      done();
    });
  });

  it('rechaza archivos que no son PDF con HttpError 400', (done) => {
    const filter = getFileFilter();
    filter({} as Request, fakeFile('image/png'), (err: unknown) => {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
      done();
    });
  });
});
