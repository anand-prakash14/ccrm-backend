// 2. Third-party
import { Router } from 'express';

// 3. Internal
import { addActivityLogNote, getActivityLog } from '@/controllers/activity-log.controller';
import { recordConclusion } from '@/controllers/conclusions.controller';
import { createEnquiry, getLead, listLeads, updateLead } from '@/controllers/leads.controller';
import { scheduleSiteVisit, updateSiteVisit } from '@/controllers/site-visits.controller';
import { AddActivityLogNoteRequestSchema } from '@/dto/activity-log.dto';
import { RecordConclusionRequestSchema } from '@/dto/conclusion.dto';
import {
  CreateEnquiryRequestSchema,
  LeadIdParamsSchema,
  LeadListQuerySchema,
  PatchLeadRequestSchema,
} from '@/dto/lead.dto';
import {
  CreateSiteVisitRequestSchema,
  SiteVisitParamsSchema,
  UpdateSiteVisitRequestSchema,
} from '@/dto/site-visit.dto';
import { requireAuth } from '@/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '@/middleware/validate.middleware';

export const leadsRouter = Router();

leadsRouter.post('/', requireAuth, validateBody(CreateEnquiryRequestSchema), createEnquiry);
leadsRouter.get('/', requireAuth, validateQuery(LeadListQuerySchema), listLeads);
leadsRouter.get('/:leadId', requireAuth, validateParams(LeadIdParamsSchema), getLead);
leadsRouter.patch(
  '/:leadId',
  requireAuth,
  validateParams(LeadIdParamsSchema),
  validateBody(PatchLeadRequestSchema),
  updateLead,
);

leadsRouter.post(
  '/:leadId/site-visits',
  requireAuth,
  validateParams(LeadIdParamsSchema),
  validateBody(CreateSiteVisitRequestSchema),
  scheduleSiteVisit,
);
leadsRouter.patch(
  '/:leadId/site-visits/:visitId',
  requireAuth,
  validateParams(SiteVisitParamsSchema),
  validateBody(UpdateSiteVisitRequestSchema),
  updateSiteVisit,
);

leadsRouter.post(
  '/:leadId/conclusion',
  requireAuth,
  validateParams(LeadIdParamsSchema),
  validateBody(RecordConclusionRequestSchema),
  recordConclusion,
);

leadsRouter.get(
  '/:leadId/activity-log',
  requireAuth,
  validateParams(LeadIdParamsSchema),
  getActivityLog,
);
leadsRouter.post(
  '/:leadId/activity-log',
  requireAuth,
  validateParams(LeadIdParamsSchema),
  validateBody(AddActivityLogNoteRequestSchema),
  addActivityLogNote,
);
