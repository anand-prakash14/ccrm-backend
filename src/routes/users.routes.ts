// 2. Third-party
import { Router } from 'express';

// 3. Internal
import { createUser, listUsers, updateUser } from '@/controllers/users.controller';
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UserIdParamsSchema,
} from '@/dto/user.dto';
import { RoleName } from '@/entities/Role.entity';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { validateBody, validateParams } from '@/middleware/validate.middleware';

export const usersRouter = Router();

// Any authenticated user — populates SalesMan pickers (site visits, lead
// filters) and name lookups; not master-data creation, so no role gate.
usersRouter.get('/', requireAuth, listUsers);

usersRouter.post(
  '/',
  requireAuth,
  requireRole(RoleName.ADMIN),
  validateBody(CreateUserRequestSchema),
  createUser,
);

usersRouter.patch(
  '/:userId',
  requireAuth,
  requireRole(RoleName.ADMIN),
  validateParams(UserIdParamsSchema),
  validateBody(UpdateUserRequestSchema),
  updateUser,
);
