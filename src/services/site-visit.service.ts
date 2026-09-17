// 3. Internal
import { ActivityLogEntryType } from '@/entities/ActivityLog.entity';
import { LeadStage } from '@/entities/Lead.entity';
import { SiteVisit, SiteVisitStatus } from '@/entities/SiteVisit.entity';
import { SiteVisitProperty, SiteVisitPropertyStatus } from '@/entities/SiteVisitProperty.entity';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/errors/app.errors';
import { AuthUser } from '@/middleware/auth.middleware';
import { ActivityLogRepository } from '@/repositories/activity-log.repository';
import { LeadRepository } from '@/repositories/lead.repository';
import { PropertyRepository } from '@/repositories/property.repository';
import { SiteVisitPropertyRepository } from '@/repositories/site-visit-property.repository';
import { SiteVisitRepository } from '@/repositories/site-visit.repository';
import { UserRepository } from '@/repositories/user.repository';
import { assertLeadAccess } from '@/services/lead-access.util';

export interface ScheduleSiteVisitInput {
  scheduledAt: string;
  accompanyingSalemanId: string;
  propertyIds: string[];
}

export interface UpdateSiteVisitInput {
  status: SiteVisitStatus;
  visitFeedback?: string;
}

export interface UpdateSiteVisitPropertyInput {
  status: SiteVisitPropertyStatus;
  notes?: string;
}

export interface SiteVisitWithProperties {
  siteVisit: SiteVisit;
  properties: SiteVisitProperty[];
}

export class SiteVisitService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly siteVisitRepository: SiteVisitRepository,
    private readonly siteVisitPropertyRepository: SiteVisitPropertyRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /** CA-84/CA-95 parity — list all site visits for a lead, each with attached properties. */
  async listForLead(actor: AuthUser, leadId: string): Promise<SiteVisitWithProperties[]> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    const siteVisits = await this.siteVisitRepository.findByLeadId(leadId);
    return Promise.all(
      siteVisits.map(async (siteVisit) => ({
        siteVisit,
        properties: await this.siteVisitPropertyRepository.findBySiteVisitId(siteVisit.id),
      })),
    );
  }

  /** CA-153 — creating a Site Visit attaches >=1 real Properties and moves the parent lead to the Site Visit stage. */
  async scheduleSiteVisit(
    actor: AuthUser,
    leadId: string,
    input: ScheduleSiteVisitInput,
    isAgentInitiated: boolean,
  ): Promise<SiteVisitWithProperties> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    const accompanyingSaleman = await this.userRepository.findById(input.accompanyingSalemanId);
    if (!accompanyingSaleman) {
      throw new BadRequestError(`User ${input.accompanyingSalemanId} does not exist`);
    }

    const properties = await Promise.all(
      input.propertyIds.map((propertyId) => this.propertyRepository.findById(propertyId)),
    );
    const missingIndex = properties.findIndex((property) => !property);
    if (missingIndex !== -1) {
      throw new BadRequestError(`Property ${input.propertyIds[missingIndex]} does not exist`);
    }

    const siteVisit = await this.siteVisitRepository.create({
      leadId: lead.id,
      scheduledAt: new Date(input.scheduledAt),
      accompanyingSalemanId: input.accompanyingSalemanId,
      status: SiteVisitStatus.SCHEDULED,
    });

    const attachedProperties = await Promise.all(
      input.propertyIds.map((propertyId) =>
        this.siteVisitPropertyRepository.create({
          siteVisitId: siteVisit.id,
          propertyId,
          status: SiteVisitPropertyStatus.SCHEDULED,
        }),
      ),
    );

    lead.stage = LeadStage.SITE_VISIT;
    await this.leadRepository.save(lead);

    const propertyNames = attachedProperties.map((attached) => attached.property.name).join(', ');
    await this.activityLogRepository.append({
      leadId: lead.id,
      entryType: ActivityLogEntryType.STAGE_CHANGE,
      content: `Site Visit scheduled for ${input.scheduledAt} — properties: ${propertyNames}; stage changed to Site Visit`,
      actorUserId: actor.id,
      isAgentInitiated,
    });

    return { siteVisit, properties: attachedProperties };
  }

  /** CA-153 — attach one more Property to an already-scheduled visit. */
  async attachProperty(
    actor: AuthUser,
    leadId: string,
    visitId: string,
    propertyId: string,
    isAgentInitiated: boolean,
  ): Promise<SiteVisitProperty> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    const siteVisit = await this.siteVisitRepository.findByIdAndLeadId(visitId, leadId);
    if (!siteVisit) {
      throw new NotFoundError(`Site visit ${visitId} not found for lead ${leadId}`);
    }

    const property = await this.propertyRepository.findById(propertyId);
    if (!property) {
      throw new BadRequestError(`Property ${propertyId} does not exist`);
    }

    const existing = await this.siteVisitPropertyRepository.findBySiteVisitAndProperty(
      visitId,
      propertyId,
    );
    if (existing) {
      throw new ConflictError(
        `Property ${propertyId} is already attached to site visit ${visitId}`,
      );
    }

    const attached = await this.siteVisitPropertyRepository.create({
      siteVisitId: visitId,
      propertyId,
      status: SiteVisitPropertyStatus.SCHEDULED,
    });

    await this.activityLogRepository.append({
      leadId: lead.id,
      entryType: ActivityLogEntryType.SITE_VISIT_FEEDBACK,
      content: `Property ${property.name} attached to Site Visit`,
      actorUserId: actor.id,
      isAgentInitiated,
    });

    return attached;
  }

  /** CA-154 — per-property status update, independent of the visit's own status (CA-25). */
  async updatePropertyStatus(
    actor: AuthUser,
    leadId: string,
    visitId: string,
    propertyId: string,
    input: UpdateSiteVisitPropertyInput,
    isAgentInitiated: boolean,
  ): Promise<SiteVisitProperty> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    const siteVisit = await this.siteVisitRepository.findByIdAndLeadId(visitId, leadId);
    if (!siteVisit) {
      throw new NotFoundError(`Site visit ${visitId} not found for lead ${leadId}`);
    }

    const attached = await this.siteVisitPropertyRepository.findBySiteVisitAndProperty(
      visitId,
      propertyId,
    );
    if (!attached) {
      throw new NotFoundError(`Property ${propertyId} is not attached to site visit ${visitId}`);
    }

    attached.status = input.status;
    if (input.notes !== undefined) {
      attached.notes = input.notes;
    }
    await this.siteVisitPropertyRepository.save(attached);

    const noteSuffix = input.notes ? ` — ${input.notes}` : '';
    await this.activityLogRepository.append({
      leadId: lead.id,
      entryType: ActivityLogEntryType.SITE_VISIT_FEEDBACK,
      content: `Property ${attached.property.name} status changed to ${input.status}${noteSuffix}`,
      actorUserId: actor.id,
      isAgentInitiated,
    });

    return attached;
  }

  /** CA-25 — status update; visitFeedback required when status=Completed. */
  async updateSiteVisit(
    actor: AuthUser,
    leadId: string,
    visitId: string,
    input: UpdateSiteVisitInput,
    isAgentInitiated: boolean,
  ): Promise<SiteVisitWithProperties> {
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

    const properties = await this.siteVisitPropertyRepository.findBySiteVisitId(siteVisit.id);
    return { siteVisit, properties };
  }
}
