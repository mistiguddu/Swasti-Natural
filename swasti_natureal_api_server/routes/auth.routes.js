import { Router } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../middlewares/request-schemas.js';
import { passwordSchema, profileSchema } from '../middlewares/admin-schemas.js';

const router = Router();
router.post('/register', validate(registerSchema), asyncHandler(controller.register));
router.post('/login', validate(loginSchema), asyncHandler(controller.login));
router.get('/me', authenticate, asyncHandler(controller.getCurrentUser));
router.put('/me', authenticate, validate(profileSchema), asyncHandler(controller.updateProfile));
router.put('/password', authenticate, validate(passwordSchema), asyncHandler(controller.changePassword));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(controller.forgotPassword));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(controller.resetPassword));
export default router;
