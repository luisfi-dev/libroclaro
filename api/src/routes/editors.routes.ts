import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as ctrl from '../controllers/editors.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, requireRole(UserRole.EDITOR));

router.post('/', asyncHandler(ctrl.createEditor));
router.post('/promote', asyncHandler(ctrl.promoteToEditor));

export default router;
