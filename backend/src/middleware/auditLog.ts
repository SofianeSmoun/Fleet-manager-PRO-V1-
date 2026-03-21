import type { Request, Response, NextFunction } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'token', 'resetToken']);

function sanitizeMetadata(body: unknown): Prisma.InputJsonValue | null {
  if (!body || typeof body !== 'object') return null;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (!SENSITIVE_KEYS.has(key)) {
      sanitized[key] = value;
    }
  }
  return Object.keys(sanitized).length > 0 ? (sanitized as Prisma.InputJsonValue) : null;
}

export function auditLog(entityType: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.sub;
        const entityId = req.params['id'] ?? (req.body as Record<string, unknown>)?.id ?? 'unknown';
        const metadata = sanitizeMetadata(req.body as unknown);

        if (userId) {
          const data: Prisma.AuditLogCreateInput = {
            entityType,
            entityId: String(entityId),
            action,
            user: { connect: { id: userId } },
          };
          if (metadata !== null) {
            data.metadata = metadata;
          }

          prisma.auditLog
            .create({ data })
            .catch((err: unknown) => {
              logger.error('AuditLog write failed', { error: err });
            });
        }
      }
    });
    next();
  };
}
