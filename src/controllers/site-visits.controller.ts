// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { siteVisitService } from '@/config/container';
import { logger } from '@/config/logger';
import {
  CreateSiteVisitRequest,
  SiteVisitResponseSchema,
  UpdateSiteVisitRequest,
} from '@/dto/site-visit.dto';
import { SiteVisit } from '@/entities/SiteVisit.entity';

function toSiteVisitResponseData(siteVisit: SiteVisit): Record<string, unknown> {
  return {
    id: siteVisit.id,
    leadId: siteVisit.leadId,
    scheduledAt: siteVisit.scheduledAt.toISOString(),
    propertyProject: siteVisit.propertyProject,
    units: siteVisit.units,
    accompanyingSalemanId: siteVisit.accompanyingSalemanId,
    status: siteVisit.status,
    visitFeedback: siteVisit.visitFeedback,
    createdAt: siteVisit.createdAt.toISOString(),
  };
}

export async function scheduleSiteVisit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as CreateSiteVisitRequest;
    const siteVisit = await siteVisitService.scheduleSiteVisit(
      req.user!,
      req.params.leadId,
      input,
      req.isAgentInitiated,
    );
    logger.info({ siteVisitId: siteVisit.id, leadId: req.params.leadId }, 'Site visit scheduled');
    res
      .status(201)
      .json(SiteVisitResponseSchema.parse({ data: toSiteVisitResponseData(siteVisit) }));
  } catch (err) {
    next(err);
  }
}

export async function updateSiteVisit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as UpdateSiteVisitRequest;
    const siteVisit = await siteVisitService.updateSiteVisit(
      req.user!,
      req.params.leadId,
      req.params.visitId,
      input,
      req.isAgentInitiated,
    );
    logger.info({ siteVisitId: siteVisit.id, status: siteVisit.status }, 'Site visit updated');
    res
      .status(200)
      .json(SiteVisitResponseSchema.parse({ data: toSiteVisitResponseData(siteVisit) }));
  } catch (err) {
    next(err);
  }
}
