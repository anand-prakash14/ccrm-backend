// 2. Third-party
import { DataSource, Repository } from 'typeorm';

// 3. Internal
import { Role } from '@/entities/Role.entity';

export class RoleRepository {
  private readonly repo: Repository<Role>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Role);
  }

  async findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<Role[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }
}
