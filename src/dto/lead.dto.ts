// 2. Third-party
import { z } from 'zod';

// 3. Internal
import { LeadSource, LeadStage } from '@/entities/Lead.entity';

export const CreateEnquiryRequestSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  source: z.nativeEnum(LeadSource),
});

// CA-10 — all six fields required together when advancing Enquiry -> Lead.
// (assignedSalemanId is validated separately at the top level, see below.)
export const LeadStageFieldsSchema = z.object({
  email: z.string().email(),
  alternatePhone: z.string().min(1),
  propertyType: z.string().min(1),
  preferredLocations: z.string().min(1),
  leadTemperature: z.string().min(1),
});

// CA-17 — Budget Range (min+max together), Purpose, Financing Status,
// Purchase Timeline required; Requirement Notes optional.
export const OpportunityStageFieldsSchema = z.object({
  budgetMin: z.number().nonnegative(),
  budgetMax: z.number().nonnegative(),
  purpose: z.string().min(1),
  financingStatus: z.string().min(1),
  purchaseTimeline: z.string().min(1),
  requirementNotes: z.string().optional(),
});

// PATCH /v1/leads/{leadId}. `stage` is intentionally restricted to
// Lead/Opportunity here — Site Visit and Conclusion stage moves only ever
// happen as a side effect of their own dedicated endpoints (CA-24, CA-26/
// CA-27), which enforce their own required fields; allowing this generic
// endpoint to jump straight to those stages would bypass that validation.
export const PatchLeadRequestSchema = z
  .object({
    stage: z.enum([LeadStage.LEAD, LeadStage.OPPORTUNITY]).optional(),
    fields: z.record(z.unknown()).optional(),
    assignedSalemanId: z.string().uuid().optional(),
  })
  .refine((body) => body.stage !== undefined || body.assignedSalemanId !== undefined, {
    message: 'At least one of stage or assignedSalemanId must be provided',
  });

export const LeadListQuerySchema = z.object({
  assignedSalemanId: z.string().uuid().optional(),
  source: z.nativeEnum(LeadSource).optional(),
  stage: z.nativeEnum(LeadStage).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const LeadIdParamsSchema = z.object({
  leadId: z.string().uuid(),
});

const LeadDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  alternatePhone: z.string().nullable(),
  email: z.string().nullable(),
  source: z.nativeEnum(LeadSource),
  stage: z.nativeEnum(LeadStage),
  propertyType: z.string().nullable(),
  preferredLocations: z.string().nullable(),
  leadTemperature: z.string().nullable(),
  assignedSalemanId: z.string().uuid().nullable(),
  budgetMin: z.number().nullable(),
  budgetMax: z.number().nullable(),
  purpose: z.string().nullable(),
  financingStatus: z.string().nullable(),
  purchaseTimeline: z.string().nullable(),
  requirementNotes: z.string().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const LeadResponseSchema = z.object({ data: LeadDataSchema });

export const LeadListResponseSchema = z.object({
  data: z.array(LeadDataSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

export type CreateEnquiryRequest = z.infer<typeof CreateEnquiryRequestSchema>;
export type PatchLeadRequest = z.infer<typeof PatchLeadRequestSchema>;
export type LeadListQuery = z.infer<typeof LeadListQuerySchema>;
