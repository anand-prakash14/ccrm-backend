// 2. Third-party
import { z } from 'zod';

const BhkTypeDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
});

export const BhkTypeListResponseSchema = z.object({ data: z.array(BhkTypeDataSchema) });
