// 2. Third-party
import { z } from 'zod';

// 3. Internal
import { PropertyStatus } from '@/entities/Property.entity';

// CA-152 — create: name/projectName/city/locality/bhkTypeId/price required;
// areaSqft optional; status defaults to Available (not client-settable at
// creation — a brand-new listing is always Available).
export const CreatePropertyRequestSchema = z.object({
  name: z.string().min(1),
  projectName: z.string().min(1),
  city: z.string().min(1),
  locality: z.string().min(1),
  bhkTypeId: z.string().uuid(),
  areaSqft: z.number().positive().optional(),
  price: z.number().positive(),
});

// Partial update — any subset of fields, including status.
export const UpdatePropertyRequestSchema = z
  .object({
    name: z.string().min(1).optional(),
    projectName: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    locality: z.string().min(1).optional(),
    bhkTypeId: z.string().uuid().optional(),
    areaSqft: z.number().positive().optional(),
    price: z.number().positive().optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  });

export const PropertyListQuerySchema = z.object({
  city: z.string().optional(),
  locality: z.string().optional(),
  bhkTypeId: z.string().uuid().optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const PropertyIdParamsSchema = z.object({
  propertyId: z.string().uuid(),
});

const PropertyDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  projectName: z.string(),
  city: z.string(),
  locality: z.string(),
  bhkTypeId: z.string().uuid(),
  bhkTypeName: z.string(),
  areaSqft: z.number().nullable(),
  price: z.number(),
  status: z.nativeEnum(PropertyStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PropertyResponseSchema = z.object({ data: PropertyDataSchema });

export const PropertyListResponseSchema = z.object({
  data: z.array(PropertyDataSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

export type CreatePropertyRequest = z.infer<typeof CreatePropertyRequestSchema>;
export type UpdatePropertyRequest = z.infer<typeof UpdatePropertyRequestSchema>;
export type PropertyListQuery = z.infer<typeof PropertyListQuerySchema>;
