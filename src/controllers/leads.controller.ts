// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { leadService } from '@/config/container';
import { logger } from '@/config/logger';
import {
  CreateEnquiryRequest,
  LeadListQuery,
  LeadListResponseSchema,
  LeadResponseSchema,
  PatchLeadRequest,
} from '@/dto/lead.dto';
import { Lead } from '@/entities/Lead.entity';

export function toLeadResponseData(lead: Lead): Record<string, unknown> {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    alternatePhone: lead.alternatePhone,
    email: lead.email,
    source: lead.source,
    stage: lead.stage,
    propertyType: lead.propertyType,
    preferredLocations: lead.preferredLocations,
    leadTemperature: lead.leadTemperature,
    assignedSalemanId: lead.assignedSalemanId,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
    purpose: lead.purpose,
    financingStatus: lead.financingStatus,
    purchaseTimeline: lead.purchaseTimeline,
    requirementNotes: lead.requirementNotes,
    createdBy: lead.createdById,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function createEnquiry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as CreateEnquiryRequest;
    const lead = await leadService.createEnquiry(req.user!, input, req.isAgentInitiated);
    logger.info({ leadId: lead.id, userId: req.user!.id }, 'Enquiry created');
    res.status(201).json(LeadResponseSchema.parse({ data: toLeadResponseData(lead) }));
  } catch (err) {
    next(err);
  }
}

export async function listLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as LeadListQuery;
    const { items, total, page, pageSize } = await leadService.listLeads(
      req.user!,
      {
        assignedSalemanId: query.assignedSalemanId,
        source: query.source,
        stage: query.stage,
        createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
        createdBefore: query.createdBefore ? new Date(query.createdBefore) : undefined,
      },
      query.page,
      query.pageSize,
    );
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.status(200).json(
      LeadListResponseSchema.parse({
        data: items.map(toLeadResponseData),
        pagination: {
          page,
          pageSize,
          totalItems: total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getLead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lead = await leadService.getLead(req.user!, req.params.leadId);
    res.status(200).json(LeadResponseSchema.parse({ data: toLeadResponseData(lead) }));
  } catch (err) {
    next(err);
  }
}

export async function updateLead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as PatchLeadRequest;
    const lead = await leadService.updateLead(
      req.user!,
      req.params.leadId,
      body,
      req.isAgentInitiated,
    );
    logger.info({ leadId: lead.id, userId: req.user!.id }, 'Lead updated');
    res.status(200).json(LeadResponseSchema.parse({ data: toLeadResponseData(lead) }));
  } catch (err) {
    next(err);
  }
}
