// 2. Third-party
import { Request, Response, Router } from 'express';

// 3. Internal
import { AppDataSource } from '@/config/data-source';
import { logger } from '@/config/logger';

export const healthRouter = Router();

/**
 * Unauthenticated, no PII, returns dependency status — for container
 * orchestration and manual checks (HLD Observability § Health Checks).
 */
healthRouter.get('/healthz', async (_req: Request, res: Response): Promise<void> => {
  try {
    await AppDataSource.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'up' });
  } catch (err) {
    logger.error({ err }, 'Health check failed: database unreachable');
    res.status(503).json({ status: 'unavailable', database: 'down' });
  }
});
