// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { activityLogService } from '@/config/container';
import { logger } from '@/config/logger';
import {
  ActivityLogEntryResponseSchema,
  ActivityLogListResponseSchema,
  AddActivityLogNoteRequest,
} from '@/dto/activity-log.dto';
import { ActivityLog } from '@/entities/ActivityLog.entity';

function toEntryResponseData(entry: ActivityLog): Record<string, unknown> {
  return {
    id: entry.id,
    entryType: entry.entryType,
    content: entry.content,
    actorUserId: entry.actorUserId,
    isAgentInitiated: entry.isAgentInitiated,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function getActivityLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const entries = await activityLogService.getForLead(req.user!, req.params.leadId);
    res
      .status(200)
      .json(ActivityLogListResponseSchema.parse({ data: entries.map(toEntryResponseData) }));
  } catch (err) {
    next(err);
  }
}

export async function addActivityLogNote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { content } = req.body as AddActivityLogNoteRequest;
    const entry = await activityLogService.addNote(
      req.user!,
      req.params.leadId,
      content,
      req.isAgentInitiated,
    );
    logger.info({ leadId: req.params.leadId, entryId: entry.id }, 'Activity log note added');
    res
      .status(201)
      .json(ActivityLogEntryResponseSchema.parse({ data: toEntryResponseData(entry) }));
  } catch (err) {
    next(err);
  }
}
