import multer from 'multer';
import { HttpError } from '../utils/HttpError';

export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(HttpError.badRequest('El archivo debe ser un PDF'));
      return;
    }
    cb(null, true);
  },
});
