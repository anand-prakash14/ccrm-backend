// 1. Node built-ins
// (none)

// 2. Third-party
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().url(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),

  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('30m'),

  // Shared secret presented by the MCP Server (Agents module) — never sent
  // by the Web Frontend — used to determine activity_log.is_agent_initiated
  // server-side (CA-121). Optional: the Agents module isn't built in this
  // phase, so agent-tagging simply never activates until it's configured.
  AGENT_SERVICE_KEY: z.string().min(16).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
