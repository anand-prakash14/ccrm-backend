// 2. Third-party
import { NextFunction, Request, Response } from 'express';

// 3. Internal
import { logger } from '@/config/logger';

/**
 * CA-142: every request is logged with timestamp (pino default), request
 * id, correlation id, user id (when authenticated), component name
 * (pino's base field), and outcome/status code — registered early so the
 * `finish` listener is armed regardless of where downstream middleware
 * (e.g. requireAuth, which populates req.user) sits in the chain.
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAtMs = Date.now();

  res.on('finish', () => {
    logger.info(
      {
        requestId: req.requestId,
        correlationId: req.correlationId,
        userId: req.user?.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAtMs,
      },
      'Request completed',
    );
  });

  next();
}
