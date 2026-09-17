// 2. Third-party
import { DataSource, Repository } from 'typeorm';

// 3. Internal
import { SiteVisitProperty } from '@/entities/SiteVisitProperty.entity';

export class SiteVisitPropertyRepository {
  private readonly repo: Repository<SiteVisitProperty>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(SiteVisitProperty);
  }

  async findBySiteVisitId(siteVisitId: string): Promise<SiteVisitProperty[]> {
    return this.repo.find({ where: { siteVisitId }, relations: ['property', 'property.bhkType'] });
  }

  async findBySiteVisitAndProperty(
    siteVisitId: string,
    propertyId: string,
  ): Promise<SiteVisitProperty | null> {
    return this.repo.findOne({
      where: { siteVisitId, propertyId },
      relations: ['property', 'property.bhkType'],
    });
  }

  async create(data: Partial<SiteVisitProperty>): Promise<SiteVisitProperty> {
    const record = this.repo.create(data);
    const saved = await this.repo.save(record);
    return (await this.findBySiteVisitAndProperty(saved.siteVisitId, saved.propertyId)) ?? saved;
  }

  async save(record: SiteVisitProperty): Promise<SiteVisitProperty> {
    return this.repo.save(record);
  }
}
