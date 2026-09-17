// 2. Third-party
import { z } from 'zod';

// 3. Internal
import { SiteVisitStatus } from '@/entities/SiteVisit.entity';

// CA-24 — all four fields required.
export const CreateSiteVisitRequestSchema = z.object({
  scheduledAt: z.string().datetime(),
  propertyProject: z.string().min(1),
  units: z.string().min(1),
  accompanyingSalemanId: z.string().uuid(),
});

// CA-25 — status required; visitFeedback required only when Completed
// (enforced in the service, since it's conditional on another field).
export const UpdateSiteVisitRequestSchema = z.object({
  status: z.nativeEnum(SiteVisitStatus),
  visitFeedback: z.string().optional(),
});

export const SiteVisitParamsSchema = z.object({
  leadId: z.string().uuid(),
  visitId: z.string().uuid(),
});

const SiteVisitDataSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  scheduledAt: z.string(),
  propertyProject: z.string(),
  units: z.string().nullable(),
  accompanyingSalemanId: z.string().uuid().nullable(),
  status: z.nativeEnum(SiteVisitStatus),
  visitFeedback: z.string().nullable(),
  createdAt: z.string(),
});

export const SiteVisitResponseSchema = z.object({ data: SiteVisitDataSchema });

export type CreateSiteVisitRequest = z.infer<typeof CreateSiteVisitRequestSchema>;
export type UpdateSiteVisitRequest = z.infer<typeof UpdateSiteVisitRequestSchema>;
