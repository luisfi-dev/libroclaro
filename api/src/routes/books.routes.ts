import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as ctrl from '../controllers/books.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { uploadPdf } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(ctrl.listBooks));
router.get('/:id', authenticate, asyncHandler(ctrl.getBook));
router.get('/:id/cover', authenticate, asyncHandler(ctrl.getBookCover));
router.get('/:id/pdf', authenticate, asyncHandler(ctrl.downloadBookPdf));

router.post(
  '/',
  authenticate,
  requireRole(UserRole.EDITOR),
  uploadPdf.single('pdf'),
  asyncHandler(ctrl.createBook),
);
router.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.updateBook),
);
router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.deleteBook),
);

export default router;
