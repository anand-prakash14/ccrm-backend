// 2. Third-party
import express, { Express } from 'express';

// 3. Internal
import { authRouter } from '@/routes/auth.routes';
import { bhkTypesRouter } from '@/routes/bhk-types.routes';
import { dashboardRouter } from '@/routes/dashboard.routes';
import { healthRouter } from '@/routes/health.routes';
import { leadsRouter } from '@/routes/leads.routes';
import { propertiesRouter } from '@/routes/properties.routes';
import { usersRouter } from '@/routes/users.routes';
import { agentContextMiddleware } from '@/middleware/agent-context.middleware';
import { correlationIdMiddleware } from '@/middleware/correlation-id.middleware';
import { errorMiddleware } from '@/middleware/error.middleware';
import { errorRateMonitorMiddleware } from '@/middleware/error-rate-monitor.middleware';
import { requestLoggingMiddleware } from '@/middleware/request-logging.middleware';

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(correlationIdMiddleware);
  app.use(agentContextMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(errorRateMonitorMiddleware);

  app.use(healthRouter);
  app.use('/v1/auth', authRouter);
  app.use('/v1/users', usersRouter);
  app.use('/v1/leads', leadsRouter);
  app.use('/v1/dashboard', dashboardRouter);
  app.use('/v1/properties', propertiesRouter);
  app.use('/v1/bhk-types', bhkTypesRouter);

  // Error middleware must be registered last.
  app.use(errorMiddleware);

  return app;
}
