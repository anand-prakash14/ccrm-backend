// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { propertyService } from '@/config/container';
import { logger } from '@/config/logger';
import {
  CreatePropertyRequest,
  PropertyListQuery,
  PropertyListResponseSchema,
  PropertyResponseSchema,
  UpdatePropertyRequest,
} from '@/dto/property.dto';
import { Property } from '@/entities/Property.entity';

function toPropertyResponseData(property: Property): Record<string, unknown> {
  return {
    id: property.id,
    name: property.name,
    projectName: property.projectName,
    city: property.city,
    locality: property.locality,
    bhkTypeId: property.bhkTypeId,
    bhkTypeName: property.bhkType.name,
    areaSqft: property.areaSqft,
    price: property.price,
    status: property.status,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
  };
}

export async function createProperty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as CreatePropertyRequest;
    const property = await propertyService.createProperty(input);
    logger.info({ propertyId: property.id, actorId: req.user!.id }, 'Property created');
    res.status(201).json(PropertyResponseSchema.parse({ data: toPropertyResponseData(property) }));
  } catch (err) {
    next(err);
  }
}

export async function listProperties(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as PropertyListQuery;
    const { items, total, page, pageSize } = await propertyService.listProperties(
      {
        city: query.city,
        locality: query.locality,
        bhkTypeId: query.bhkTypeId,
        status: query.status,
        search: query.search,
      },
      query.page,
      query.pageSize,
    );
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.status(200).json(
      PropertyListResponseSchema.parse({
        data: items.map(toPropertyResponseData),
        pagination: {
          page,
          pageSize,
          totalItems: total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertyService.getProperty(req.params.propertyId);
    res.status(200).json(PropertyResponseSchema.parse({ data: toPropertyResponseData(property) }));
  } catch (err) {
    next(err);
  }
}

export async function updateProperty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as UpdatePropertyRequest;
    const property = await propertyService.updateProperty(req.params.propertyId, input);
    logger.info({ propertyId: property.id, actorId: req.user!.id }, 'Property updated');
    res.status(200).json(PropertyResponseSchema.parse({ data: toPropertyResponseData(property) }));
  } catch (err) {
    next(err);
  }
}
