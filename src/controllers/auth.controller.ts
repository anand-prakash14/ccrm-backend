// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { authService } from '@/config/container';
import { logger } from '@/config/logger';
import { LoginRequest, LoginResponseSchema } from '@/dto/auth.dto';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as LoginRequest;
    const result = await authService.login(email, password);
    logger.info({ userId: result.user.id }, 'User logged in');
    res.status(200).json(LoginResponseSchema.parse({ data: result }));
  } catch (err) {
    next(err);
  }
}
