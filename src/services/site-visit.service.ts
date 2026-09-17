// 3. Internal
import { ActivityLogEntryType } from '@/entities/ActivityLog.entity';
import { LeadStage } from '@/entities/Lead.entity';
import { SiteVisit, SiteVisitStatus } from '@/entities/SiteVisit.entity';
import { BadRequestError, NotFoundError, ValidationError } from '@/errors/app.errors';
import { AuthUser } from '@/middleware/auth.middleware';
import { ActivityLogRepository } from '@/repositories/activity-log.repository';
import { LeadRepository } from '@/repositories/lead.repository';
import { SiteVisitRepository } from '@/repositories/site-visit.repository';
import { UserRepository } from '@/repositories/user.repository';
import { assertLeadAccess } from '@/services/lead-access.util';

export interface ScheduleSiteVisitInput {
  scheduledAt: string;
  propertyProject: string;
  units: string;
  accompanyingSalemanId: string;
}

export interface UpdateSiteVisitInput {
  status: SiteVisitStatus;
  visitFeedback?: string;
}

export class SiteVisitService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly siteVisitRepository: SiteVisitRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /** CA-24 — creating a Site Visit moves the parent lead to the Site Visit stage. */
  async scheduleSiteVisit(
    actor: AuthUser,
    leadId: string,
    input: ScheduleSiteVisitInput,
    isAgentInitiated: boolean,
  ): Promise<SiteVisit> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    const accompanyingSaleman = await this.userRepository.findById(input.accompanyingSalemanId);
    if (!accompanyingSaleman) {
      throw new BadRequestError(`User ${input.accompanyingSalemanId} does not exist`);
    }

    const siteVisit = await this.siteVisitRepository.create({
      leadId: lead.id,
      scheduledAt: new Date(input.scheduledAt),
      propertyProject: input.propertyProject,
      units: input.units,
      accompanyingSalemanId: input.accompanyingSalemanId,
      status: SiteVisitStatus.SCHEDULED,
    });

    lead.stage = LeadStage.SITE_VISIT;
    await this.leadRepository.save(lead);

    await this.activityLogRepository.append({
      leadId: lead.id,
      entryType: ActivityLogEntryType.STAGE_CHANGE,
      content: `Site Visit scheduled for ${input.scheduledAt} at ${input.propertyProject}; stage changed to Site Visit`,
      actorUserId: actor.id,
      isAgentInitiated,
    });

    return siteVisit;
  }

  /** CA-25 — status update; visitFeedback required when status=Completed. */
  async updateSiteVisit(
    actor: AuthUser,
    leadId: string,
    visitId: string,
    input: UpdateSiteVisitInput,
    isAgentInitiated: boolean,
  ): Promise<SiteVisit> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    const siteVisit = await this.siteVisitRepository.findByIdAndLeadId(visitId, leadId);
    if (!siteVisit) {
      throw new NotFoundError(`Site visit ${visitId} not found for lead ${leadId}`);
    }

    if (input.status === SiteVisitStatus.COMPLETED && !input.visitFeedback) {
      throw new ValidationError('visitFeedback is required when status is Completed');
    }

    siteVisit.status = input.status;
    if (input.visitFeedback !== undefined) {
      siteVisit.visitFeedback = input.visitFeedback;
    }
    await this.siteVisitRepository.save(siteVisit);

    const contentSuffix = input.visitFeedback ? ` — feedback: ${input.visitFeedback}` : '';
    await this.activityLogRepository.append({
      leadId: lead.id,
      entryType: ActivityLogEntryType.SITE_VISIT_FEEDBACK,
      content: `Site Visit status changed to ${input.status}${contentSuffix}`,
      actorUserId: actor.id,
      isAgentInitiated,
    });

    return siteVisit;
  }
}
