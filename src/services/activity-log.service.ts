// 3. Internal
import { ActivityLog, ActivityLogEntryType } from '@/entities/ActivityLog.entity';
import { NotFoundError } from '@/errors/app.errors';
import { AuthUser } from '@/middleware/auth.middleware';
import { ActivityLogRepository } from '@/repositories/activity-log.repository';
import { LeadRepository } from '@/repositories/lead.repository';
import { assertLeadAccess } from '@/services/lead-access.util';

export class ActivityLogService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  /** CA-84 — full history, identical regardless of the lead's current stage. */
  async getForLead(actor: AuthUser, leadId: string): Promise<ActivityLog[]> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);
    return this.activityLogRepository.findByLeadId(leadId);
  }

  /** CA-83 — manual free-text note. */
  async addNote(
    actor: AuthUser,
    leadId: string,
    content: string,
    isAgentInitiated: boolean,
  ): Promise<ActivityLog> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    return this.activityLogRepository.append({
      leadId,
      entryType: ActivityLogEntryType.NOTE,
      content,
      actorUserId: actor.id,
      isAgentInitiated,
    });
  }
}
