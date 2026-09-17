// 1. Node built-ins
// (none)

// 2. Third-party
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

// 3. Internal
import { logger } from '@/config/logger';
import { AppError } from '@/errors/app.errors';

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    logger.warn({ path: req.path, issues: err.issues }, 'Request validation failed');
    res.status(422).json({
      error: { message: 'Validation failed', issues: err.issues },
    });
    return;
  }

  if (err instanceof AppError) {
    logger.warn({ path: req.path, statusCode: err.statusCode }, err.message);
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  logger.error({ path: req.path, err }, 'Unhandled error');
  res.status(500).json({ error: { message: 'Internal server error' } });
}
