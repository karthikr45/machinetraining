import { requireRole, handle } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { runMockInspection } from '@/lib/mock-inspection-engine';
import { sendInspectionReport } from '@/lib/email-service';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';
import type { InspectionResult } from '@/lib/types';

/** POST /api/mock-inspection/start — run a mock FDA inspection (managers only). */
export async function POST(req: Request) {
  return handle(async (): Promise<{ result: InspectionResult }> => {
    const manager = await requireRole(MANAGER_ROLES);

    const result = await runMockInspection(manager.companyId);

    await logAction({
      userId: manager.id,
      action: 'MOCK_INSPECTION',
      entityType: 'Company',
      entityId: manager.companyId,
      newValue: { grade: result.grade, overall: result.readiness.overall },
      changeReason: 'Mock FDA inspection executed',
      ipAddress: getClientIp(req.headers),
    });

    // Best-effort report email — never block the response on delivery.
    try {
      await sendInspectionReport(
        { id: manager.id, name: manager.name, email: manager.email },
        { grade: result.grade, overall: result.readiness.overall }
      );
    } catch (err) {
      console.error('[MOCK_INSPECTION] report email failed', err);
    }

    return { result };
  });
}
