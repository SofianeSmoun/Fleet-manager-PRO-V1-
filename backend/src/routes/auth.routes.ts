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

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authentification utilisateur
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie — access_token + refresh_token cookie
 *       401:
 *         description: Email ou mot de passe invalide
 */
router.post('/login', authRateLimit, validate(loginSchema), (req, res, next) => { void login(req, res, next); });

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Renouvellement du token d'accès
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Nouveau access_token + rotation refresh_token cookie
 *       401:
 *         description: Refresh token invalide ou expiré
 */
router.post('/refresh', authRateLimit, (req, res, next) => { void refresh(req, res, next); });

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Déconnexion — expire le cookie refresh_token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
router.post('/logout', logout);
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), (req, res, next) => { void forgotPassword(req, res, next); });
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), (req, res, next) => { void resetPassword(req, res, next); });

export { router as authRouter };
