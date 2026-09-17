// 2. Third-party
import { Router } from 'express';

// 3. Internal
import { getDashboardSummary } from '@/controllers/dashboard.controller';
import { requireAuth } from '@/middleware/auth.middleware';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', requireAuth, getDashboardSummary);
