// 2. Third-party
import { NextFunction, Request, Response } from 'express';

// 3. Internal
import { logger } from '@/config/logger';

const WINDOW_MS = 5 * 60 * 1000;
const ERROR_RATE_ALERT_THRESHOLD = 0.05;
const MIN_SAMPLES_BEFORE_ALERTING = 20;
const ALERT_COOLDOWN_MS = 60 * 1000;

interface RequestOutcome {
  timestampMs: number;
  isError: boolean;
}

// Module-level ring buffer of recent request outcomes — deliberately
// in-process rather than an external metrics store, since no cloud
// provider/metrics stack is chosen yet (HLD Open Item). Good enough to
// satisfy CA-142's single alert rule; revisit if/when a real metrics
// backend (Prometheus, etc.) is adopted.
const recentOutcomes: RequestOutcome[] = [];
let lastAlertAtMs = 0;

function pruneOldOutcomes(nowMs: number): void {
  while (recentOutcomes.length > 0 && nowMs - recentOutcomes[0].timestampMs > WINDOW_MS) {
    recentOutcomes.shift();
  }
}

/**
 * CA-142: "Given the CRM API Service's error rate exceeds 5% over a
 * 5-minute window, then an alert fires." No dashboard/visualization
 * tooling is in scope for this story — the "alert" is a distinct,
 * greppable error-level log line, since no alerting backend is chosen yet.
 */
export function errorRateMonitorMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const now = Date.now();
    recentOutcomes.push({ timestampMs: now, isError: res.statusCode >= 500 });
    pruneOldOutcomes(now);

    if (recentOutcomes.length < MIN_SAMPLES_BEFORE_ALERTING) {
      return;
    }
    if (now - lastAlertAtMs < ALERT_COOLDOWN_MS) {
      return;
    }

    const errorCount = recentOutcomes.filter((o) => o.isError).length;
    const errorRate = errorCount / recentOutcomes.length;

    if (errorRate > ERROR_RATE_ALERT_THRESHOLD) {
      lastAlertAtMs = now;
      logger.error(
        {
          alert: 'error_rate_threshold_exceeded',
          errorRate,
          threshold: ERROR_RATE_ALERT_THRESHOLD,
          sampleSize: recentOutcomes.length,
          windowMs: WINDOW_MS,
        },
        'ALERT: CRM API error rate exceeded 5% over the last 5 minutes',
      );
    }
  });

  next();
}
