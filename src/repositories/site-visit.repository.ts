// 2. Third-party
import { DataSource, Repository } from 'typeorm';

// 3. Internal
import { SiteVisit } from '@/entities/SiteVisit.entity';

export class SiteVisitRepository {
  private readonly repo: Repository<SiteVisit>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(SiteVisit);
  }

  async findById(id: string): Promise<SiteVisit | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdAndLeadId(id: string, leadId: string): Promise<SiteVisit | null> {
    return this.repo.findOne({ where: { id, leadId } });
  }

  async findByLeadId(leadId: string): Promise<SiteVisit[]> {
    return this.repo.find({ where: { leadId }, order: { scheduledAt: 'DESC' } });
  }

  async create(data: Partial<SiteVisit>): Promise<SiteVisit> {
    const siteVisit = this.repo.create(data);
    return this.repo.save(siteVisit);
  }

  async save(siteVisit: SiteVisit): Promise<SiteVisit> {
    return this.repo.save(siteVisit);
  }
}
