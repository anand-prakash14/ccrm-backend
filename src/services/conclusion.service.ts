// 3. Internal
import { ActivityLogEntryType } from '@/entities/ActivityLog.entity';
import { Conclusion, ConclusionOutcome, LostReason } from '@/entities/Conclusion.entity';
import { LeadStage } from '@/entities/Lead.entity';
import { ConflictError, NotFoundError, ValidationError } from '@/errors/app.errors';
import { AuthUser } from '@/middleware/auth.middleware';
import { ActivityLogRepository } from '@/repositories/activity-log.repository';
import { ConclusionRepository } from '@/repositories/conclusion.repository';
import { LeadRepository } from '@/repositories/lead.repository';
import { assertLeadAccess } from '@/services/lead-access.util';

export interface RecordConclusionInput {
  outcome: ConclusionOutcome;
  unitBooked?: string;
  bookingTokenAmount?: number;
  salePrice?: number;
  bookingDate?: string;
  lostReason?: LostReason;
  notes?: string;
}

export class ConclusionService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly conclusionRepository: ConclusionRepository,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  /** Read-side counterpart to recordConclusion — returns null if none recorded yet. */
  async getConclusion(actor: AuthUser, leadId: string): Promise<Conclusion | null> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    return this.conclusionRepository.findByLeadId(leadId);
  }

  /** CA-26 (Won) / CA-27 (Lost, On-hold) — moves the lead to the Conclusion stage. */
  async recordConclusion(
    actor: AuthUser,
    leadId: string,
    input: RecordConclusionInput,
    isAgentInitiated: boolean,
  ): Promise<Conclusion> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    const existing = await this.conclusionRepository.findByLeadId(leadId);
    if (existing) {
      throw new ConflictError(`Lead ${leadId} already has a recorded Conclusion`);
    }

    this.validateOutcomeFields(input);

    const conclusion = await this.conclusionRepository.create({
      leadId,
      outcome: input.outcome,
      unitBooked: input.unitBooked ?? null,
      bookingTokenAmount: input.bookingTokenAmount ?? null,
      salePrice: input.salePrice ?? null,
      bookingDate: input.bookingDate ?? null,
      lostReason: input.lostReason ?? null,
      notes: input.notes ?? null,
    });

    lead.stage = LeadStage.CONCLUSION;
    await this.leadRepository.save(lead);

    await this.activityLogRepository.append({
      leadId,
      entryType: ActivityLogEntryType.STAGE_CHANGE,
      content: `Conclusion recorded: ${input.outcome}${input.outcome === ConclusionOutcome.LOST ? ` (${String(input.lostReason)})` : ''}`,
      actorUserId: actor.id,
      isAgentInitiated,
    });

    return conclusion;
  }

  private validateOutcomeFields(input: RecordConclusionInput): void {
    if (input.outcome === ConclusionOutcome.WON) {
      const missing = (
        ['unitBooked', 'bookingTokenAmount', 'salePrice', 'bookingDate'] as const
      ).filter((key) => input[key] === undefined);
      if (missing.length > 0) {
        throw new ValidationError(
          `Missing required field(s) for Won outcome: ${missing.join(', ')}`,
        );
      }
    }

    if (input.outcome === ConclusionOutcome.LOST && !input.lostReason) {
      throw new ValidationError('lostReason is required for Lost outcome');
    }
  }
}
