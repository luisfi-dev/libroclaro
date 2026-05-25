import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as ctrl from '../controllers/catalog.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/subjects', authenticate, asyncHandler(ctrl.listSubjects));
router.post(
  '/subjects',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.createSubject),
);

router.get('/grade-levels', authenticate, asyncHandler(ctrl.listGradeLevels));
router.post(
  '/grade-levels',
  authenticate,
  requireRole(UserRole.EDITOR),
  asyncHandler(ctrl.createGradeLevel),
);

export default router;
