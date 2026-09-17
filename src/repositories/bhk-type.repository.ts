// 2. Third-party
import { DataSource, Repository } from 'typeorm';

// 3. Internal
import { BhkType } from '@/entities/BhkType.entity';

export class BhkTypeRepository {
  private readonly repo: Repository<BhkType>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(BhkType);
  }

  async findAll(): Promise<BhkType[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<BhkType | null> {
    return this.repo.findOne({ where: { id } });
  }
}
