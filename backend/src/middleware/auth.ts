import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface AuthPayload {
  sub: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare global { namespace Express { interface Request { user?: AuthPayload } } }

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token manquant ou invalide' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET non configuré');

  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, secret) as AuthPayload;
  } catch {
    res.status(401).json({ message: 'Token expiré ou invalide' });
    return;
  }

  // Vérification de l'utilisateur en base (pas de cache — sécurité maximale)
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null, isActive: true },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    res.status(401).json({ message: 'Utilisateur introuvable ou désactivé' });
    return;
  }

  req.user = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: payload.iat,
    exp: payload.exp,
  };

  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json({
          message: `Accès interdit — rôle requis : ${roles.join(' ou ')}. Rôle actuel : ${req.user.role}`,
        });
      return;
    }
    next();
  };
}
