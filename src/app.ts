// 2. Third-party
import express, { Express } from 'express';

// 3. Internal
import { authRouter } from '@/routes/auth.routes';
import { dashboardRouter } from '@/routes/dashboard.routes';
import { healthRouter } from '@/routes/health.routes';
import { leadsRouter } from '@/routes/leads.routes';
import { usersRouter } from '@/routes/users.routes';
import { agentContextMiddleware } from '@/middleware/agent-context.middleware';
import { correlationIdMiddleware } from '@/middleware/correlation-id.middleware';
import { errorMiddleware } from '@/middleware/error.middleware';

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(correlationIdMiddleware);
  app.use(agentContextMiddleware);

  app.use(healthRouter);
  app.use('/v1/auth', authRouter);
  app.use('/v1/users', usersRouter);
  app.use('/v1/leads', leadsRouter);
  app.use('/v1/dashboard', dashboardRouter);

  // Error middleware must be registered last.
  app.use(errorMiddleware);

  return app;
}
