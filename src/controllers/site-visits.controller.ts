// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { siteVisitService } from '@/config/container';
import { logger } from '@/config/logger';
import {
  AttachSiteVisitPropertyRequest,
  AttachedPropertyResponseSchema,
  CreateSiteVisitRequest,
  SiteVisitListResponseSchema,
  SiteVisitResponseSchema,
  UpdateSiteVisitPropertyRequest,
  UpdateSiteVisitRequest,
} from '@/dto/site-visit.dto';
import { SiteVisit } from '@/entities/SiteVisit.entity';
import { SiteVisitProperty } from '@/entities/SiteVisitProperty.entity';
import { SiteVisitWithProperties } from '@/services/site-visit.service';

function toAttachedPropertyData(attached: SiteVisitProperty): Record<string, unknown> {
  return {
    propertyId: attached.propertyId,
    status: attached.status,
    notes: attached.notes,
    property: {
      id: attached.property.id,
      name: attached.property.name,
      projectName: attached.property.projectName,
      city: attached.property.city,
      locality: attached.property.locality,
      bhkTypeName: attached.property.bhkType.name,
      areaSqft: attached.property.areaSqft,
      price: attached.property.price,
    },
  };
}

function toSiteVisitResponseData(
  siteVisit: SiteVisit,
  properties: SiteVisitProperty[],
): Record<string, unknown> {
  return {
    id: siteVisit.id,
    leadId: siteVisit.leadId,
    scheduledAt: siteVisit.scheduledAt.toISOString(),
    accompanyingSalemanId: siteVisit.accompanyingSalemanId,
    status: siteVisit.status,
    visitFeedback: siteVisit.visitFeedback,
    createdAt: siteVisit.createdAt.toISOString(),
    properties: properties.map(toAttachedPropertyData),
  };
}

export async function listSiteVisits(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const results = await siteVisitService.listForLead(req.user!, req.params.leadId);
    res.status(200).json(
      SiteVisitListResponseSchema.parse({
        data: results.map((r: SiteVisitWithProperties) =>
          toSiteVisitResponseData(r.siteVisit, r.properties),
        ),
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function scheduleSiteVisit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as CreateSiteVisitRequest;
    const { siteVisit, properties } = await siteVisitService.scheduleSiteVisit(
      req.user!,
      req.params.leadId,
      input,
      req.isAgentInitiated,
    );
    logger.info({ siteVisitId: siteVisit.id, leadId: req.params.leadId }, 'Site visit scheduled');
    res
      .status(201)
      .json(
        SiteVisitResponseSchema.parse({ data: toSiteVisitResponseData(siteVisit, properties) }),
      );
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
    const { siteVisit, properties } = await siteVisitService.updateSiteVisit(
      req.user!,
      req.params.leadId,
      req.params.visitId,
      input,
      req.isAgentInitiated,
    );
    logger.info({ siteVisitId: siteVisit.id, status: siteVisit.status }, 'Site visit updated');
    res
      .status(200)
      .json(
        SiteVisitResponseSchema.parse({ data: toSiteVisitResponseData(siteVisit, properties) }),
      );
  } catch (err) {
    next(err);
  }
}

export async function attachSiteVisitProperty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { propertyId } = req.body as AttachSiteVisitPropertyRequest;
    const attached = await siteVisitService.attachProperty(
      req.user!,
      req.params.leadId,
      req.params.visitId,
      propertyId,
      req.isAgentInitiated,
    );
    logger.info({ siteVisitId: req.params.visitId, propertyId }, 'Property attached to site visit');
    res
      .status(201)
      .json(AttachedPropertyResponseSchema.parse({ data: toAttachedPropertyData(attached) }));
  } catch (err) {
    next(err);
  }
}

export async function updateSiteVisitPropertyStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as UpdateSiteVisitPropertyRequest;
    const attached = await siteVisitService.updatePropertyStatus(
      req.user!,
      req.params.leadId,
      req.params.visitId,
      req.params.propertyId,
      input,
      req.isAgentInitiated,
    );
    logger.info(
      {
        siteVisitId: req.params.visitId,
        propertyId: req.params.propertyId,
        status: attached.status,
      },
      'Site visit property status updated',
    );
    res
      .status(200)
      .json(AttachedPropertyResponseSchema.parse({ data: toAttachedPropertyData(attached) }));
  } catch (err) {
    next(err);
  }
}
