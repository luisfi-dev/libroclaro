import { Router } from 'express';
import * as ctrl from '../controllers/subscriptions.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/status', authenticate, asyncHandler(ctrl.getStatus));
router.post('/subscribe', authenticate, asyncHandler(ctrl.subscribe));
router.get('/invoices', authenticate, asyncHandler(ctrl.listInvoices));

export default router;
