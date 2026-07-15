import { requireRole, handle } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { calculateReadinessScore } from '@/lib/mock-inspection-engine';
import type { ReadinessScore } from '@/lib/types';

export const dynamic = "force-dynamic";

/** GET /api/mock-inspection/readiness — current inspection readiness score (managers only). */
export async function GET() {
  return handle(async (): Promise<{ readiness: ReadinessScore }> => {
    const manager = await requireRole(MANAGER_ROLES);
    const readiness = await calculateReadinessScore(manager.companyId);
    return { readiness };
  });
}
