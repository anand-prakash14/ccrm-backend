// 2. Third-party
import express, { Express } from 'express';

// 3. Internal
import { authRouter } from '@/routes/auth.routes';
import { healthRouter } from '@/routes/health.routes';
import { correlationIdMiddleware } from '@/middleware/correlation-id.middleware';
import { errorMiddleware } from '@/middleware/error.middleware';

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(correlationIdMiddleware);

  app.use(healthRouter);
  app.use('/v1/auth', authRouter);

  // Error middleware must be registered last.
  app.use(errorMiddleware);

  return app;
}
