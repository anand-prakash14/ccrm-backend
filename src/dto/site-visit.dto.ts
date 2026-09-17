// 2. Third-party
import { z } from 'zod';

// 3. Internal
import { SiteVisitStatus } from '@/entities/SiteVisit.entity';
import { SiteVisitPropertyStatus } from '@/entities/SiteVisitProperty.entity';

// CA-153 — scheduling requires at least one existing Property (by id) in
// place of the old free-text propertyProject/units fields.
export const CreateSiteVisitRequestSchema = z.object({
  scheduledAt: z.string().datetime(),
  accompanyingSalemanId: z.string().uuid(),
  propertyIds: z.array(z.string().uuid()).min(1),
});

// CA-25 — status required; visitFeedback required only when Completed
// (enforced in the service, since it's conditional on another field).
export const UpdateSiteVisitRequestSchema = z.object({
  status: z.nativeEnum(SiteVisitStatus),
  visitFeedback: z.string().optional(),
});

// CA-153 — attach one more Property to an already-scheduled visit.
export const AttachSiteVisitPropertyRequestSchema = z.object({
  propertyId: z.string().uuid(),
});

// CA-154 — per-property status update.
export const UpdateSiteVisitPropertyRequestSchema = z.object({
  status: z.nativeEnum(SiteVisitPropertyStatus),
  notes: z.string().optional(),
});

export const SiteVisitParamsSchema = z.object({
  leadId: z.string().uuid(),
  visitId: z.string().uuid(),
});

export const SiteVisitPropertyParamsSchema = z.object({
  leadId: z.string().uuid(),
  visitId: z.string().uuid(),
  propertyId: z.string().uuid(),
});

const AttachedPropertyDataSchema = z.object({
  propertyId: z.string().uuid(),
  status: z.nativeEnum(SiteVisitPropertyStatus),
  notes: z.string().nullable(),
  property: z.object({
    id: z.string().uuid(),
    name: z.string(),
    projectName: z.string(),
    city: z.string(),
    locality: z.string(),
    bhkTypeName: z.string(),
    areaSqft: z.number().nullable(),
    price: z.number(),
  }),
});

const SiteVisitDataSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  scheduledAt: z.string(),
  accompanyingSalemanId: z.string().uuid().nullable(),
  status: z.nativeEnum(SiteVisitStatus),
  visitFeedback: z.string().nullable(),
  createdAt: z.string(),
  properties: z.array(AttachedPropertyDataSchema),
});

export const SiteVisitResponseSchema = z.object({ data: SiteVisitDataSchema });
export const SiteVisitListResponseSchema = z.object({ data: z.array(SiteVisitDataSchema) });
export const AttachedPropertyResponseSchema = z.object({ data: AttachedPropertyDataSchema });

export type CreateSiteVisitRequest = z.infer<typeof CreateSiteVisitRequestSchema>;
export type UpdateSiteVisitRequest = z.infer<typeof UpdateSiteVisitRequestSchema>;
export type AttachSiteVisitPropertyRequest = z.infer<typeof AttachSiteVisitPropertyRequestSchema>;
export type UpdateSiteVisitPropertyRequest = z.infer<typeof UpdateSiteVisitPropertyRequestSchema>;
