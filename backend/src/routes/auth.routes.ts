import { Router, type IRouter } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, refresh, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../lib/schemas';

const isProduction = process.env['NODE_ENV'] === 'production';

const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion — réessayez dans 1 minute' },
  skipSuccessfulRequests: false,
  skip: () => !isProduction,
});

const router: IRouter = Router();

router.post('/login', authRateLimit, validate(loginSchema), (req, res, next) => { void login(req, res, next); });
router.post('/refresh', authRateLimit, (req, res, next) => { void refresh(req, res, next); });
router.post('/logout', logout);
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), (req, res, next) => { void forgotPassword(req, res, next); });
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), (req, res, next) => { void resetPassword(req, res, next); });

export { router as authRouter };
