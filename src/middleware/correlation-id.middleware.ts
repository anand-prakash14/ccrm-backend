// 1. Node built-ins
import { randomUUID } from 'node:crypto';

// 2. Third-party
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'X-Request-Id';
const CORRELATION_ID_HEADER = 'X-Correlation-Id';

/**
 * Assigns/propagates X-Request-Id and X-Correlation-Id per
 * api-design-guidelines (HLD Observability section) so a single chat/UI
 * action can be traced across the Web Frontend/MCP Server -> CRM API hop,
 * and later across the full Agent Orchestrator -> MCP Server -> CRM API
 * chain once the Agents module exists.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  req.correlationId = req.header(CORRELATION_ID_HEADER) ?? randomUUID();

  res.setHeader(REQUEST_ID_HEADER, req.requestId);
  res.setHeader(CORRELATION_ID_HEADER, req.correlationId);

  next();
}
