import { requireUser, handle } from '@/lib/api-helpers';
import { checkScheduleMCompliance } from '@/lib/schedule-m';

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/schedule-m
 * Indian GMP Schedule M compliance checklist for the caller's company.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const report = await checkScheduleMCompliance(user.companyId);
    return report;
  });
}
