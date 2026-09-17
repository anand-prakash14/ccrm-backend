// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { leadService } from '@/config/container';
import { DashboardSummaryResponseSchema } from '@/dto/dashboard.dto';

export async function getDashboardSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await leadService.getDashboardSummary(req.user!);
    res.status(200).json(DashboardSummaryResponseSchema.parse({ data: summary }));
  } catch (err) {
    next(err);
  }
}
