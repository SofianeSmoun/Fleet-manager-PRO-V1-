import { Router, type IRouter } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, refresh, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../lib/schemas';

const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion — réessayez dans 1 minute' },
  skipSuccessfulRequests: false,
});

const router: IRouter = Router();

router.post('/login', authRateLimit, validate(loginSchema), login);
router.post('/refresh', authRateLimit, refresh);
router.post('/logout', logout);
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), resetPassword);

export { router as authRouter };
