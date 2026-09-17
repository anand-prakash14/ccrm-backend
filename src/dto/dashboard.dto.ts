// 2. Third-party
import { z } from 'zod';

// 3. Internal
import { LeadStage } from '@/entities/Lead.entity';

const ConversionByStageSchema = z.object({
  fromStage: z.nativeEnum(LeadStage),
  toStage: z.nativeEnum(LeadStage),
  rate: z.number().min(0).max(1),
});

const BySourceSchema = z.object({
  source: z.string(),
  leadCount: z.number().int().nonnegative(),
});

const BySalemanSchema = z.object({
  salemanId: z.string().uuid(),
  leadCount: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(1),
});

export const DashboardSummaryResponseSchema = z.object({
  data: z.object({
    conversionByStage: z.array(ConversionByStageSchema),
    bySource: z.array(BySourceSchema),
    // Admin-only (CA-93) — omitted entirely for SalesMan callers.
    bySaleman: z.array(BySalemanSchema).optional(),
  }),
});
