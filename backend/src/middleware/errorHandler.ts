import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      message: 'Erreur de validation',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message = statusCode === 500 ? 'Erreur serveur interne' : err.message;

  if (statusCode === 500) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
  }

  res.status(statusCode).json({ message, code: err.code });
}
