// 2. Third-party
import { Router } from 'express';

// 3. Internal
import { createUser, updateUser } from '@/controllers/users.controller';
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UserIdParamsSchema,
} from '@/dto/user.dto';
import { RoleName } from '@/entities/Role.entity';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { validateBody, validateParams } from '@/middleware/validate.middleware';

export const usersRouter = Router();

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
