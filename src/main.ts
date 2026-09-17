// 2. Third-party
import 'reflect-metadata';

// 3. Internal
import { createApp } from '@/app';
import { AppDataSource } from '@/config/data-source';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  logger.info('Database connection established');

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'CRM API Service listening');
  });
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start CRM API Service');
  process.exitCode = 1;
});
