// 2. Third-party
import { Router } from 'express';

// 3. Internal
import { login } from '@/controllers/auth.controller';
import { LoginRequestSchema } from '@/dto/auth.dto';
import { validateBody } from '@/middleware/validate.middleware';

export const authRouter = Router();

// The one public (unauthenticated) endpoint on the CRM API — also the
// endpoint the ADK Web UI calls for its own second-login flow (CA-96).
authRouter.post('/login', validateBody(LoginRequestSchema), login);
