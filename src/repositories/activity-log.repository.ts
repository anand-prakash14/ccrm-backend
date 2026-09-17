// 2. Third-party
import { DataSource, Repository } from 'typeorm';

// 3. Internal
import { ActivityLog, ActivityLogEntryType } from '@/entities/ActivityLog.entity';

export interface AppendActivityLogEntry {
  leadId: string;
  entryType: ActivityLogEntryType;
  content: string;
  actorUserId: string;
  isAgentInitiated: boolean;
}

export class ActivityLogRepository {
  private readonly repo: Repository<ActivityLog>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ActivityLog);
  }

  async append(entry: AppendActivityLogEntry): Promise<ActivityLog> {
    const record = this.repo.create(entry);
    return this.repo.save(record);
  }

  async findByLeadId(leadId: string): Promise<ActivityLog[]> {
    return this.repo.find({
      where: { leadId },
      order: { createdAt: 'DESC' },
    });
  }
}
