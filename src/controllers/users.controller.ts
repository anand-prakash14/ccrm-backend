// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { userService } from '@/config/container';
import { logger } from '@/config/logger';
import {
  CreateUserRequest,
  CreateUserResponseSchema,
  UpdateUserRequest,
  UpdateUserResponseSchema,
  UserListResponseSchema,
} from '@/dto/user.dto';

export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await userService.listUsers();
    res.status(200).json(
      UserListResponseSchema.parse({
        data: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          isActive: user.isActive,
        })),
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, roleId } = req.body as CreateUserRequest;
    const { user, temporaryPassword } = await userService.createUser(name, email, roleId);
    logger.info({ userId: user.id, actorId: req.user?.id }, 'User created');
    res.status(201).json(
      CreateUserResponseSchema.parse({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          roleId: user.roleId,
          role: user.role.name,
          isActive: user.isActive,
          temporaryPassword,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params;
    const { isActive } = req.body as UpdateUserRequest;
    const user = await userService.setActive(userId, isActive);
    logger.info({ userId: user.id, isActive, actorId: req.user?.id }, 'User active state changed');
    res
      .status(200)
      .json(UpdateUserResponseSchema.parse({ data: { id: user.id, isActive: user.isActive } }));
  } catch (err) {
    next(err);
  }
}
