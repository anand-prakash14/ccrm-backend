// 2. Third-party
import pino, { Logger } from 'pino';

// 3. Internal
import { env } from '@/config/env';

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { component: 'ccrm-crm-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
