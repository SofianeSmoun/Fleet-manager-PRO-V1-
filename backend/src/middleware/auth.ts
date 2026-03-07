import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';

export interface AuthPayload {
  sub: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token manquant ou invalide' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET non configuré');

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Token expiré ou invalide' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Accès interdit — rôle insuffisant' });
      return;
    }
    next();
  };
}
