// 2. Third-party
import { Router } from 'express';

// 3. Internal
import {
  createProperty,
  getProperty,
  listProperties,
  updateProperty,
} from '@/controllers/properties.controller';
import {
  CreatePropertyRequestSchema,
  PropertyIdParamsSchema,
  PropertyListQuerySchema,
  UpdatePropertyRequestSchema,
} from '@/dto/property.dto';
import { RoleName } from '@/entities/Role.entity';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '@/middleware/validate.middleware';

export const propertiesRouter = Router();

// Read endpoints: any authenticated user (SalesMen browse inventory when
// scheduling site visits) — CA-152.
propertiesRouter.get('/', requireAuth, validateQuery(PropertyListQuerySchema), listProperties);
propertiesRouter.get(
  '/:propertyId',
  requireAuth,
  validateParams(PropertyIdParamsSchema),
  getProperty,
);

// Write endpoints: Admin-only, matching the CA-122/CA-123 master-data precedent.
propertiesRouter.post(
  '/',
  requireAuth,
  requireRole(RoleName.ADMIN),
  validateBody(CreatePropertyRequestSchema),
  createProperty,
);
propertiesRouter.patch(
  '/:propertyId',
  requireAuth,
  requireRole(RoleName.ADMIN),
  validateParams(PropertyIdParamsSchema),
  validateBody(UpdatePropertyRequestSchema),
  updateProperty,
);
