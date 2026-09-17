// 2. Third-party
import { NextFunction, Request, Response } from 'express';

// 3. Internal
import { env } from '@/config/env';

const AGENT_SERVICE_KEY_HEADER = 'X-Agent-Service-Key';

/**
 * Resolves activity_log.is_agent_initiated (CA-121) from a validated
 * server-to-server credential — never from an arbitrary client-supplied
 * flag, which would be trivially spoofable. Only the MCP Server (Agents
 * module) is configured with AGENT_SERVICE_KEY; the Web Frontend never
 * presents this header. If the header doesn't exactly match the configured
 * key (or no key is configured yet, since the Agents module isn't built in
 * this phase), the request is treated as UI-initiated.
 */
export function agentContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const presentedKey = req.header(AGENT_SERVICE_KEY_HEADER);
  req.isAgentInitiated = Boolean(
    env.AGENT_SERVICE_KEY && presentedKey && presentedKey === env.AGENT_SERVICE_KEY,
  );
  next();
}
