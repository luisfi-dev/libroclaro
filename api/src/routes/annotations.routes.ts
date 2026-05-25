import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as ctrl from '../controllers/annotations.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Listado por libro (anidado)
export const bookAnnotationsRouter = Router({ mergeParams: true });
bookAnnotationsRouter.get('/', authenticate, asyncHandler(ctrl.listForBook));
bookAnnotationsRouter.post(
  '/',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.createAnnotation),
);

// Acciones sobre una anotación individual
router.get('/:id/reveal', authenticate, asyncHandler(ctrl.revealAnnotation));
router.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.updateAnnotation),
);
router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.deleteAnnotation),
);

export default router;
