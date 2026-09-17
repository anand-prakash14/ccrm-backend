// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { conclusionService } from '@/config/container';
import { logger } from '@/config/logger';
import {
  ConclusionResponseSchema,
  GetConclusionResponseSchema,
  RecordConclusionRequest,
} from '@/dto/conclusion.dto';
import { Conclusion } from '@/entities/Conclusion.entity';

function toConclusionResponseData(conclusion: Conclusion): Record<string, unknown> {
  return {
    id: conclusion.id,
    leadId: conclusion.leadId,
    outcome: conclusion.outcome,
    unitBooked: conclusion.unitBooked,
    bookingTokenAmount: conclusion.bookingTokenAmount,
    salePrice: conclusion.salePrice,
    bookingDate: conclusion.bookingDate,
    lostReason: conclusion.lostReason,
    notes: conclusion.notes,
    createdAt: conclusion.createdAt.toISOString(),
  };
}

export async function getConclusion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conclusion = await conclusionService.getConclusion(req.user!, req.params.leadId);
    res.status(200).json(
      GetConclusionResponseSchema.parse({
        data: conclusion ? toConclusionResponseData(conclusion) : null,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function recordConclusion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as RecordConclusionRequest;
    const conclusion = await conclusionService.recordConclusion(
      req.user!,
      req.params.leadId,
      input,
      req.isAgentInitiated,
    );
    logger.info({ leadId: req.params.leadId, outcome: conclusion.outcome }, 'Conclusion recorded');
    res
      .status(201)
      .json(ConclusionResponseSchema.parse({ data: toConclusionResponseData(conclusion) }));
  } catch (err) {
    next(err);
  }
}
