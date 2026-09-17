// 3. Internal
import { ActivityLogEntryType } from '@/entities/ActivityLog.entity';
import { Lead, LeadSource, LeadStage } from '@/entities/Lead.entity';
import { RoleName } from '@/entities/Role.entity';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/errors/app.errors';
import { AuthUser } from '@/middleware/auth.middleware';
import { ActivityLogRepository } from '@/repositories/activity-log.repository';
import {
  LeadFilter,
  LeadRepository,
  SalemanBreakdown,
  SourceBreakdown,
} from '@/repositories/lead.repository';
import { UserRepository } from '@/repositories/user.repository';
import { assertLeadAccess } from '@/services/lead-access.util';
import { LeadStageFieldsSchema, OpportunityStageFieldsSchema } from '@/dto/lead.dto';

export interface CreateEnquiryInput {
  name: string;
  phone: string;
  source: LeadSource;
}

export interface PaginatedLeads {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardSummary {
  conversionByStage: { fromStage: LeadStage; toStage: LeadStage; rate: number }[];
  bySource: SourceBreakdown[];
  bySaleman?: SalemanBreakdown[];
}

// Pipeline order — used both for the PATCH stage-transition guard and for
// the dashboard's funnel conversion-rate calculation.
const STAGE_ORDER: readonly LeadStage[] = [
  LeadStage.ENQUIRY,
  LeadStage.LEAD,
  LeadStage.OPPORTUNITY,
  LeadStage.SITE_VISIT,
  LeadStage.CONCLUSION,
];

export class LeadService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createEnquiry(
    actor: AuthUser,
    input: CreateEnquiryInput,
    isAgentInitiated: boolean,
  ): Promise<Lead> {
    const lead = await this.leadRepository.create({
      name: input.name,
      phone: input.phone,
      source: input.source,
      stage: LeadStage.ENQUIRY,
      createdById: actor.id,
    });

    await this.activityLogRepository.append({
      leadId: lead.id,
      entryType: ActivityLogEntryType.STAGE_CHANGE,
      content: 'Enquiry created',
      actorUserId: actor.id,
      isAgentInitiated,
    });

    return this.getLead(actor, lead.id);
  }

  async getLead(actor: AuthUser, leadId: string): Promise<Lead> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);
    return lead;
  }

  async listLeads(
    actor: AuthUser,
    filter: LeadFilter,
    page: number,
    pageSize: number,
  ): Promise<PaginatedLeads> {
    // CA-43: SalesMan is force-scoped to their own leads regardless of any
    // assignedSalemanId supplied in the query string.
    const scopedFilter: LeadFilter =
      actor.role === RoleName.ADMIN ? filter : { ...filter, assignedSalemanId: actor.id };

    const { items, total } = await this.leadRepository.findPaginated(
      scopedFilter,
      (page - 1) * pageSize,
      pageSize,
    );
    return { items, total, page, pageSize };
  }

  /**
   * PATCH /v1/leads/{leadId} — stage advancement (Lead/Opportunity) and/or
   * Admin-only reassignment (CA-10, CA-17, CA-28, CA-67).
   */
  async updateLead(
    actor: AuthUser,
    leadId: string,
    body: { stage?: LeadStage; fields?: Record<string, unknown>; assignedSalemanId?: string },
    isAgentInitiated: boolean,
  ): Promise<Lead> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundError(`Lead ${leadId} not found`);
    }
    assertLeadAccess(actor, lead.assignedSalemanId, lead.createdById);

    if (body.assignedSalemanId !== undefined) {
      await this.applyReassignment(actor, lead, body.assignedSalemanId, isAgentInitiated);
    }

    if (body.stage !== undefined) {
      await this.applyStageTransition(actor, lead, body.stage, body.fields ?? {}, isAgentInitiated);
    }

    await this.leadRepository.save(lead);
    return this.getLead(actor, lead.id);
  }

  private async applyReassignment(
    actor: AuthUser,
    lead: Lead,
    newAssignedSalemanId: string,
    isAgentInitiated: boolean,
  ): Promise<void> {
    const isActualReassignment =
      lead.assignedSalemanId !== null && lead.assignedSalemanId !== newAssignedSalemanId;

    // CA-67: changing an *existing* assignment is Admin-only. Setting it
    // for the first time (typically as part of the Enquiry -> Lead fields,
    // per the HLD's "Set at Lead stage; reassignable by Admin only") is not
    // itself restricted here beyond the standard lead-access check above.
    if (isActualReassignment && actor.role !== RoleName.ADMIN) {
      throw new ForbiddenError('Only an Admin may reassign a lead');
    }

    const newSaleman = await this.userRepository.findById(newAssignedSalemanId);
    if (!newSaleman) {
      throw new BadRequestError(`User ${newAssignedSalemanId} does not exist`);
    }

    const previousSalemanId = lead.assignedSalemanId;
    // Both the FK column and the relation object must be updated together —
    // `lead.assignedSaleman` was eagerly loaded (findById's `relations`),
    // and TypeORM's save() derives the persisted FK from a loaded relation
    // object in preference to a directly-set scalar column, so updating
    // only `assignedSalemanId` here would silently no-op on save().
    lead.assignedSalemanId = newAssignedSalemanId;
    lead.assignedSaleman = newSaleman;

    if (previousSalemanId !== newAssignedSalemanId) {
      await this.activityLogRepository.append({
        leadId: lead.id,
        entryType: ActivityLogEntryType.NOTE,
        content: previousSalemanId
          ? `Lead reassigned from SalesMan ${previousSalemanId} to ${newAssignedSalemanId}`
          : `Lead assigned to SalesMan ${newAssignedSalemanId}`,
        actorUserId: actor.id,
        isAgentInitiated,
      });
    }
  }

  private async applyStageTransition(
    actor: AuthUser,
    lead: Lead,
    targetStage: LeadStage,
    fields: Record<string, unknown>,
    isAgentInitiated: boolean,
  ): Promise<void> {
    const fromStage = lead.stage;

    if (targetStage === LeadStage.LEAD) {
      const parsed = LeadStageFieldsSchema.parse(fields);
      lead.email = parsed.email;
      lead.alternatePhone = parsed.alternatePhone;
      lead.propertyType = parsed.propertyType;
      lead.preferredLocations = parsed.preferredLocations;
      lead.leadTemperature = parsed.leadTemperature;
    } else if (targetStage === LeadStage.OPPORTUNITY) {
      const parsed = OpportunityStageFieldsSchema.parse(fields);
      lead.budgetMin = parsed.budgetMin;
      lead.budgetMax = parsed.budgetMax;
      lead.purpose = parsed.purpose;
      lead.financingStatus = parsed.financingStatus;
      lead.purchaseTimeline = parsed.purchaseTimeline;
      lead.requirementNotes = parsed.requirementNotes ?? null;
    } else {
      // Unreachable given PatchLeadRequestSchema's enum, kept for safety.
      throw new ValidationError(`Unsupported stage transition target: ${String(targetStage)}`);
    }

    lead.stage = targetStage;

    await this.activityLogRepository.append({
      leadId: lead.id,
      entryType: ActivityLogEntryType.STAGE_CHANGE,
      content: `Stage changed from ${fromStage} to ${targetStage}`,
      actorUserId: actor.id,
      isAgentInitiated,
    });
  }

  /**
   * CA-92/93/94 dashboard. conversionByStage and bySource are scoped to the
   * caller (own leads for SalesMan, all leads for Admin); bySaleman is
   * populated only for Admin callers.
   */
  async getDashboardSummary(actor: AuthUser): Promise<DashboardSummary> {
    const scopeSalemanId = actor.role === RoleName.ADMIN ? undefined : actor.id;

    const stageCounts = await this.leadRepository.countGroupedByStage(scopeSalemanId);
    const conversionByStage = STAGE_ORDER.slice(0, -1).map((fromStage, index) => {
      const toStage = STAGE_ORDER[index + 1];
      const atOrAfter = (stage: LeadStage): number =>
        STAGE_ORDER.slice(STAGE_ORDER.indexOf(stage)).reduce((sum, s) => sum + stageCounts[s], 0);
      const denominator = atOrAfter(fromStage);
      const numerator = atOrAfter(toStage);
      return { fromStage, toStage, rate: denominator > 0 ? numerator / denominator : 0 };
    });

    const bySource = await this.leadRepository.countGroupedBySource(scopeSalemanId);

    const summary: DashboardSummary = { conversionByStage, bySource };
    if (actor.role === RoleName.ADMIN) {
      summary.bySaleman = await this.leadRepository.countGroupedBySalemanWithWonRate();
    }
    return summary;
  }
}
