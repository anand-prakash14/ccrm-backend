// 2. Third-party
import { Router } from 'express';

// 3. Internal
import { listBhkTypes } from '@/controllers/bhk-types.controller';
import { requireAuth } from '@/middleware/auth.middleware';

export const bhkTypesRouter = Router();

bhkTypesRouter.get('/', requireAuth, listBhkTypes);
