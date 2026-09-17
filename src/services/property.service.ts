// 3. Internal
import { Property } from '@/entities/Property.entity';
import { BadRequestError, NotFoundError } from '@/errors/app.errors';
import { BhkTypeRepository } from '@/repositories/bhk-type.repository';
import { PropertyFilter, PropertyRepository } from '@/repositories/property.repository';

export interface CreatePropertyInput {
  name: string;
  projectName: string;
  city: string;
  locality: string;
  bhkTypeId: string;
  areaSqft?: number;
  price: number;
}

export interface UpdatePropertyInput {
  name?: string;
  projectName?: string;
  city?: string;
  locality?: string;
  bhkTypeId?: string;
  areaSqft?: number;
  price?: number;
  status?: Property['status'];
}

export interface PaginatedProperties {
  items: Property[];
  total: number;
  page: number;
  pageSize: number;
}

export class PropertyService {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly bhkTypeRepository: BhkTypeRepository,
  ) {}

  /** Admin-only (enforced by requireRole at the route level — CA-152). */
  async createProperty(input: CreatePropertyInput): Promise<Property> {
    const bhkType = await this.bhkTypeRepository.findById(input.bhkTypeId);
    if (!bhkType) {
      throw new BadRequestError(`BHK type ${input.bhkTypeId} does not exist`);
    }

    return this.propertyRepository.create({
      name: input.name,
      projectName: input.projectName,
      city: input.city,
      locality: input.locality,
      bhkTypeId: input.bhkTypeId,
      areaSqft: input.areaSqft ?? null,
      price: input.price,
    });
  }

  async getProperty(propertyId: string): Promise<Property> {
    const property = await this.propertyRepository.findById(propertyId);
    if (!property) {
      throw new NotFoundError(`Property ${propertyId} not found`);
    }
    return property;
  }

  async listProperties(
    filter: PropertyFilter,
    page: number,
    pageSize: number,
  ): Promise<PaginatedProperties> {
    const { items, total } = await this.propertyRepository.findPaginated(
      filter,
      (page - 1) * pageSize,
      pageSize,
    );
    return { items, total, page, pageSize };
  }

  /** Admin-only (enforced by requireRole at the route level — CA-152). */
  async updateProperty(propertyId: string, input: UpdatePropertyInput): Promise<Property> {
    const property = await this.getProperty(propertyId);

    if (input.bhkTypeId !== undefined) {
      const bhkType = await this.bhkTypeRepository.findById(input.bhkTypeId);
      if (!bhkType) {
        throw new BadRequestError(`BHK type ${input.bhkTypeId} does not exist`);
      }
      property.bhkTypeId = input.bhkTypeId;
      property.bhkType = bhkType;
    }
    if (input.name !== undefined) property.name = input.name;
    if (input.projectName !== undefined) property.projectName = input.projectName;
    if (input.city !== undefined) property.city = input.city;
    if (input.locality !== undefined) property.locality = input.locality;
    if (input.areaSqft !== undefined) property.areaSqft = input.areaSqft;
    if (input.price !== undefined) property.price = input.price;
    if (input.status !== undefined) property.status = input.status;

    await this.propertyRepository.save(property);
    return this.getProperty(propertyId);
  }
}
