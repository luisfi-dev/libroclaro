import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as ctrl from '../controllers/materials.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

export const bookMaterialsRouter = Router({ mergeParams: true });
bookMaterialsRouter.get('/', authenticate, asyncHandler(ctrl.listForBook));
bookMaterialsRouter.post(
  '/',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.create),
);

router.get('/:id', authenticate, asyncHandler(ctrl.getById));
router.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.update),
);
router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.remove),
);

export default router;
