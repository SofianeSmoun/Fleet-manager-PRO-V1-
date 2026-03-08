import type { Request, Response, NextFunction } from 'express';
import { loginService, refreshService, forgotPasswordService, resetPasswordService } from '../services/auth.service';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours en ms
  path: '/api/v1/auth',
};

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const ip = req.ip ?? 'unknown';

    const { user, tokens } = await loginService(email, password, ip);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
    res.status(200).json({
      access_token: tokens.accessToken,
      token_type: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token manquant' });
      return;
    }

    const { tokens } = await refreshService(refreshToken);

    // Rotation du cookie
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
    res.status(200).json({
      access_token: tokens.accessToken,
      token_type: 'Bearer',
    });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.status(200).json({ message: 'Déconnexion réussie' });
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    await forgotPasswordService(email);
    // Toujours 200 même si email inexistant (sécurité)
    res.status(200).json({ message: 'Si cet email existe, un lien de réinitialisation a été généré.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    await resetPasswordService(token, newPassword);
    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    next(err);
  }
}
