import { Router } from 'express';
import passport from 'passport';
import * as AuthController from '@/controllers/auth.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/authenticate';
import { authLimiter } from '@/middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '@/validators/auth.validator';

const router = Router();

// ─── Local Auth ───────────────────────────────────────────────────────────────
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refresh);
router.post('/logout', validate(refreshTokenSchema), AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);

// ─── Protected ────────────────────────────────────────────────────────────────
router.get('/me', authenticate, AuthController.getMe);
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  AuthController.changePassword,
);

// ─── Google OAuth2 ────────────────────────────────────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/v1/auth/login' }),
  AuthController.googleCallback,
);

export default router;
