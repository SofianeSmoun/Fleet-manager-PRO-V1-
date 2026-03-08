import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type { Role } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

function getJwtSecret(): string {
  const s = process.env['JWT_SECRET'];
  if (!s) throw new Error('JWT_SECRET non configuré');
  return s;
}

function getRefreshSecret(): string {
  const s = process.env['JWT_REFRESH_SECRET'];
  if (!s) throw new Error('JWT_REFRESH_SECRET non configuré');
  return s;
}

function signAccessToken(user: AuthUser): string {
  const expiresIn = (process.env['JWT_EXPIRES_IN'] ?? '1h') as StringValue;
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn },
  );
}

function signRefreshToken(userId: string): string {
  const expiresIn = (process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d') as StringValue;
  return jwt.sign(
    { sub: userId },
    getRefreshSecret(),
    { expiresIn },
  );
}

export async function loginService(
  email: string,
  password: string,
  ip: string,
): Promise<{ user: AuthUser; tokens: TokenPair }> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (!user || !user.isActive) {
    logger.warn('Login échoué — utilisateur introuvable ou inactif', { email, ip });
    throw Object.assign(new Error('Email ou mot de passe incorrect'), { statusCode: 401 });
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    logger.warn('Login échoué — mot de passe incorrect', { email, ip });
    throw Object.assign(new Error('Email ou mot de passe incorrect'), { statusCode: 401 });
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };

  const tokens: TokenPair = {
    accessToken: signAccessToken(authUser),
    refreshToken: signRefreshToken(user.id),
  };

  logger.info('Login réussi', { userId: user.id, email, role: user.role, ip });
  return { user: authUser, tokens };
}

// ─── Forgot / Reset password ───────────────────────────────────────────────────

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function forgotPasswordService(email: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, isActive: true },
  });

  if (!user) {
    // Toujours retourner sans erreur (sécurité — ne pas révéler si l'email existe)
    logger.info('Forgot password — email inconnu (ignoré silencieusement)', { email });
    return;
  }

  const token = randomUUID();
  const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  // En V1 : pas d'email — on logue le token pour les tests
  logger.info('Forgot password — reset token généré', {
    userId: user.id,
    email,
    token,
    expiresAt: expiry.toISOString(),
  });
}

export async function resetPasswordService(token: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
      deletedAt: null,
      isActive: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error('Token invalide ou expiré'), { statusCode: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  logger.info('Reset password réussi', { userId: user.id, email: user.email });
}

export async function refreshService(
  refreshToken: string,
): Promise<{ user: AuthUser; tokens: TokenPair }> {
  let payload: { sub: string };
  try {
    payload = jwt.verify(refreshToken, getRefreshSecret()) as { sub: string };
  } catch {
    throw Object.assign(new Error('Refresh token invalide ou expiré'), { statusCode: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null, isActive: true },
  });

  if (!user) {
    throw Object.assign(new Error('Utilisateur introuvable ou inactif'), { statusCode: 401 });
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };

  // Rotation : nouveau refresh token émis à chaque appel
  const tokens: TokenPair = {
    accessToken: signAccessToken(authUser),
    refreshToken: signRefreshToken(user.id),
  };

  return { user: authUser, tokens };
}
