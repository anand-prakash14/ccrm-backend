// 2. Third-party
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// 3. Internal
import { env } from '@/config/env';
import { UnauthorizedError, ForbiddenError } from '@/errors/app.errors';
import { RoleName } from '@/entities/Role.entity';

export interface AuthUser {
  id: string;
  role: RoleName;
}

interface AccessTokenPayload {
  sub: string;
  role: RoleName;
}

const AUTH_HEADER_PREFIX = 'Bearer ';

/**
 * Verifies the bearer JWT and resolves the caller's identity/role from its
 * signed claims (never `jwt.decode`) — the single authorization boundary the
 * HLD requires (FR-30/31): identical for the Web Frontend and, later, the
 * MCP Server acting on behalf of the conversational agent, since both
 * present the same kind of user JWT to this same middleware.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('Authorization');
  if (!header || !header.startsWith(AUTH_HEADER_PREFIX)) {
    next(new UnauthorizedError('Missing or malformed Authorization header'));
    return;
  }

  const token = header.slice(AUTH_HEADER_PREFIX.length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/**
 * Guards a route to one or more roles. Must run after `requireAuth`.
 */
export function requireRole(...allowedRoles: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
