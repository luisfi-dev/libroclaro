import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import * as usersCtrl from '../controllers/users.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/register', asyncHandler(authCtrl.register));
router.post('/login', asyncHandler(authCtrl.login));
router.get('/me', authenticate, asyncHandler(authCtrl.me));
router.patch('/me', authenticate, asyncHandler(usersCtrl.updateMe));
router.delete('/me', authenticate, asyncHandler(usersCtrl.deleteMe));

export default router;
