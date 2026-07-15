import { getCurrentUser, isManager } from '@/lib/auth';
import { handle, ApiError } from '@/lib/api-helpers';
import { runDailyExpiryCheck } from '@/lib/expiry-checker';
import { addDays, formatDate } from '@/lib/utils';

/**
 * POST /api/schedule/expiry-check
 * Daily cron endpoint. Authorised by the `x-cron-secret` header matching
 * CRON_SECRET, OR by an authenticated manager triggering it manually.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const secret = req.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;
    const authorisedByCron = Boolean(cronSecret) && secret === cronSecret;

    let triggeredBy = 'cron';
    if (!authorisedByCron) {
      const user = await getCurrentUser();
      if (!user || !isManager(user.role)) {
        throw new ApiError('Unauthorized — cron secret or manager role required', 401);
      }
      triggeredBy = user.email;
    }

    const report = await runDailyExpiryCheck();
    return {
      ranAt: new Date().toISOString(),
      triggeredBy,
      report,
    };
  });
}

/**
 * GET /api/schedule/expiry-check
 * Lightweight status — when the next daily run is due.
 */
export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw new ApiError('Unauthorized', 401);

    const now = new Date();
    const nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 1, 0, 0);
    return {
      job: 'daily-expiry-check',
      schedule: 'Daily at 01:00 (server time)',
      nextDue: nextRun.toISOString(),
      nextDueLabel: formatDate(nextRun),
      window: `${formatDate(now)} → ${formatDate(addDays(now, 30))}`,
    };
  });
}
