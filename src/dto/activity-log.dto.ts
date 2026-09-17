// 2. Third-party
import { z } from 'zod';

// 3. Internal
import { ActivityLogEntryType } from '@/entities/ActivityLog.entity';

// CA-83 — manual note. actorUserId/isAgentInitiated are never client-supplied.
export const AddActivityLogNoteRequestSchema = z.object({
  content: z.string().min(1),
});

const ActivityLogEntryDataSchema = z.object({
  id: z.string().uuid(),
  entryType: z.nativeEnum(ActivityLogEntryType),
  content: z.string(),
  actorUserId: z.string().uuid(),
  isAgentInitiated: z.boolean(),
  createdAt: z.string(),
});

export const ActivityLogEntryResponseSchema = z.object({ data: ActivityLogEntryDataSchema });
export const ActivityLogListResponseSchema = z.object({
  data: z.array(ActivityLogEntryDataSchema),
});

export type AddActivityLogNoteRequest = z.infer<typeof AddActivityLogNoteRequestSchema>;
