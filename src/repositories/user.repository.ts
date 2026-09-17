// 2. Third-party
import { DataSource, Repository } from 'typeorm';

// 3. Internal
import { AppUser } from '@/entities/AppUser.entity';

export class UserRepository {
  private readonly repo: Repository<AppUser>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(AppUser);
  }

  async findByEmail(email: string): Promise<AppUser | null> {
    return this.repo.findOne({ where: { email }, relations: ['role'] });
  }

  async findById(id: string): Promise<AppUser | null> {
    return this.repo.findOne({ where: { id }, relations: ['role'] });
  }

  async findPaginated(skip: number, take: number): Promise<{ items: AppUser[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      relations: ['role'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { items, total };
  }

  async create(data: Partial<AppUser>): Promise<AppUser> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async setActive(id: string, isActive: boolean): Promise<AppUser | null> {
    const user = await this.repo.findOne({ where: { id }, relations: ['role'] });
    if (!user) return null;
    user.isActive = isActive;
    return this.repo.save(user);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repo.count({ where: { email } });
    return count > 0;
  }
}
