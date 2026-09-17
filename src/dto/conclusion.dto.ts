// 2. Third-party
import { z } from 'zod';

// 3. Internal
import { ConclusionOutcome, LostReason } from '@/entities/Conclusion.entity';

// CA-26/CA-27 — required fields differ per outcome; only `outcome` is
// unconditionally required here, the rest are enforced in the service
// (Zod discriminated unions don't compose cleanly with the free-text
// budget-style optional fields used elsewhere in this DTO set).
export const RecordConclusionRequestSchema = z.object({
  outcome: z.nativeEnum(ConclusionOutcome),
  unitBooked: z.string().optional(),
  bookingTokenAmount: z.number().optional(),
  salePrice: z.number().optional(),
  bookingDate: z.string().optional(),
  lostReason: z.nativeEnum(LostReason).optional(),
  notes: z.string().optional(),
});

const ConclusionDataSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  outcome: z.nativeEnum(ConclusionOutcome),
  unitBooked: z.string().nullable(),
  bookingTokenAmount: z.number().nullable(),
  salePrice: z.number().nullable(),
  bookingDate: z.string().nullable(),
  lostReason: z.nativeEnum(LostReason).nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const ConclusionResponseSchema = z.object({ data: ConclusionDataSchema });
export const GetConclusionResponseSchema = z.object({ data: ConclusionDataSchema.nullable() });

export type RecordConclusionRequest = z.infer<typeof RecordConclusionRequestSchema>;
