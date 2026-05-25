import { Router } from 'express';
import * as ctrl from '../controllers/institutions.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate, requireRole(UserRole.ADMIN_INSTITUCION));

router.get('/me', asyncHandler(ctrl.getMine));
router.patch('/me', asyncHandler(ctrl.updateMine));
router.get('/me/members', asyncHandler(ctrl.listMembers));
router.post('/me/members', asyncHandler(ctrl.createMember));
router.post('/me/members/existing', asyncHandler(ctrl.addExistingMember));
router.patch('/me/members/:id', asyncHandler(ctrl.updateMember));
router.delete('/me/members/:id', asyncHandler(ctrl.removeMember));

export default router;
