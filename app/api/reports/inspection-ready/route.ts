import { requireUser, handle } from '@/lib/api-helpers';
import { calculateReadinessScore } from '@/lib/mock-inspection-engine';

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/inspection-ready
 * Inspection readiness score for the caller's company.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const readiness = await calculateReadinessScore(user.companyId);
    const grade =
      readiness.overall >= 85 ? 'READY' : readiness.overall >= 65 ? 'NEEDS_IMPROVEMENT' : 'NOT_READY';
    return { readiness, grade };
  });
}
