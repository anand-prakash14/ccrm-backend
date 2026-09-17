// 2. Third-party
import { DataSource, Repository } from 'typeorm';

// 3. Internal
import { Lead, LeadSource, LeadStage } from '@/entities/Lead.entity';

export interface LeadFilter {
  assignedSalemanId?: string;
  source?: LeadSource;
  stage?: LeadStage;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface SourceBreakdown {
  source: LeadSource;
  leadCount: number;
}

export interface SalemanBreakdown {
  salemanId: string;
  leadCount: number;
  conversionRate: number;
}

export class LeadRepository {
  private readonly repo: Repository<Lead>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Lead);
  }

  async findById(id: string): Promise<Lead | null> {
    return this.repo.findOne({ where: { id }, relations: ['assignedSaleman', 'createdBy'] });
  }

  async create(data: Partial<Lead>): Promise<Lead> {
    const lead = this.repo.create(data);
    return this.repo.save(lead);
  }

  async save(lead: Lead): Promise<Lead> {
    return this.repo.save(lead);
  }

  async findPaginated(
    filter: LeadFilter,
    skip: number,
    take: number,
  ): Promise<{ items: Lead[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedSaleman', 'assignedSaleman');

    if (filter.assignedSalemanId) {
      qb.andWhere('lead.assigned_saleman_id = :assignedSalemanId', {
        assignedSalemanId: filter.assignedSalemanId,
      });
    }
    if (filter.source) {
      qb.andWhere('lead.source = :source', { source: filter.source });
    }
    if (filter.stage) {
      qb.andWhere('lead.stage = :stage', { stage: filter.stage });
    }
    if (filter.createdAfter) {
      qb.andWhere('lead.created_at >= :createdAfter', { createdAfter: filter.createdAfter });
    }
    if (filter.createdBefore) {
      qb.andWhere('lead.created_at <= :createdBefore', { createdBefore: filter.createdBefore });
    }

    const [items, total] = await qb
      .orderBy('lead.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { items, total };
  }

  /** Count of leads per stage, scoped to one SalesMan when provided (CA-92). */
  async countGroupedByStage(scopeSalemanId?: string): Promise<Record<LeadStage, number>> {
    const qb = this.repo
      .createQueryBuilder('lead')
      .select('lead.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lead.stage');

    if (scopeSalemanId) {
      qb.where('lead.assigned_saleman_id = :scopeSalemanId', { scopeSalemanId });
    }

    const rows = await qb.getRawMany<{ stage: LeadStage; count: string }>();

    const counts = Object.fromEntries(
      Object.values(LeadStage).map((stage) => [stage, 0]),
    ) as Record<LeadStage, number>;
    for (const row of rows) {
      counts[row.stage] = Number(row.count);
    }
    return counts;
  }

  /** Lead count grouped by source, scoped to one SalesMan when provided (CA-94). */
  async countGroupedBySource(scopeSalemanId?: string): Promise<SourceBreakdown[]> {
    const qb = this.repo
      .createQueryBuilder('lead')
      .select('lead.source', 'source')
      .addSelect('COUNT(*)', 'leadCount')
      .groupBy('lead.source');

    if (scopeSalemanId) {
      qb.where('lead.assigned_saleman_id = :scopeSalemanId', { scopeSalemanId });
    }

    const rows = await qb.getRawMany<{ source: LeadSource; leadCount: string }>();
    return rows.map((row) => ({ source: row.source, leadCount: Number(row.leadCount) }));
  }

  /**
   * Per-SalesMan lead count and "Won" close rate — Admin-only view (CA-93).
   * conversionRate = (leads with a Won conclusion) / (all leads assigned).
   */
  async countGroupedBySalemanWithWonRate(): Promise<SalemanBreakdown[]> {
    const rows = await this.repo
      .createQueryBuilder('lead')
      .select('lead.assigned_saleman_id', 'salemanId')
      .addSelect('COUNT(*)', 'leadCount')
      .addSelect(`COUNT(*) FILTER (WHERE conclusion.outcome = 'Won')`, 'wonCount')
      .leftJoin('conclusion', 'conclusion', 'conclusion.lead_id = lead.id')
      .where('lead.assigned_saleman_id IS NOT NULL')
      .groupBy('lead.assigned_saleman_id')
      .getRawMany<{ salemanId: string; leadCount: string; wonCount: string }>();

    return rows.map((row) => {
      const leadCount = Number(row.leadCount);
      const wonCount = Number(row.wonCount);
      return {
        salemanId: row.salemanId,
        leadCount,
        conversionRate: leadCount > 0 ? wonCount / leadCount : 0,
      };
    });
  }
}
