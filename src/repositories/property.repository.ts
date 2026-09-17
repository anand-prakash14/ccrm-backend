// 2. Third-party
import { DataSource, Repository } from 'typeorm';

// 3. Internal
import { Property, PropertyStatus } from '@/entities/Property.entity';

export interface PropertyFilter {
  city?: string;
  locality?: string;
  bhkTypeId?: string;
  status?: PropertyStatus;
  search?: string;
}

export class PropertyRepository {
  private readonly repo: Repository<Property>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Property);
  }

  async findById(id: string): Promise<Property | null> {
    return this.repo.findOne({ where: { id }, relations: ['bhkType'] });
  }

  async create(data: Partial<Property>): Promise<Property> {
    const property = this.repo.create(data);
    const saved = await this.repo.save(property);
    return (await this.findById(saved.id)) ?? saved;
  }

  async save(property: Property): Promise<Property> {
    return this.repo.save(property);
  }

  async findPaginated(
    filter: PropertyFilter,
    skip: number,
    take: number,
  ): Promise<{ items: Property[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.bhkType', 'bhkType');

    if (filter.city) {
      qb.andWhere('property.city ILIKE :city', { city: `%${filter.city}%` });
    }
    if (filter.locality) {
      qb.andWhere('property.locality ILIKE :locality', { locality: `%${filter.locality}%` });
    }
    if (filter.bhkTypeId) {
      qb.andWhere('property.bhk_type_id = :bhkTypeId', { bhkTypeId: filter.bhkTypeId });
    }
    if (filter.status) {
      qb.andWhere('property.status = :status', { status: filter.status });
    }
    if (filter.search) {
      qb.andWhere('(property.name ILIKE :search OR property.project_name ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    const [items, total] = await qb
      .orderBy('property.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { items, total };
  }
}
