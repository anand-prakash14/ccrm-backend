// 2. Third-party
import { DataSource, Repository } from 'typeorm';

// 3. Internal
import { Conclusion } from '@/entities/Conclusion.entity';

export class ConclusionRepository {
  private readonly repo: Repository<Conclusion>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Conclusion);
  }

  async findByLeadId(leadId: string): Promise<Conclusion | null> {
    return this.repo.findOne({ where: { leadId } });
  }

  async create(data: Partial<Conclusion>): Promise<Conclusion> {
    const conclusion = this.repo.create(data);
    return this.repo.save(conclusion);
  }
}
