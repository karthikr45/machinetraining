import { requireUser, handle } from '@/lib/api-helpers';
import { getExpiryReport } from '@/lib/expiry-checker';
import { daysUntil } from '@/lib/utils';

interface ExpiryRow {
  id: string;
  user: string;
  department: string | null;
  machine: string;
  status: string;
  expiresAt: Date | null;
  daysRemaining: number | null;
}

/**
 * GET /api/reports/expiry
 * Certification expiry report for the caller's company, shaped for reporting.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const report = await getExpiryReport(user.companyId);

    const shape = (records: typeof report.records): ExpiryRow[] =>
      records.map((r) => ({
        id: r.id,
        user: r.user.name,
        department: r.user.department ?? null,
        machine: r.machine.name,
        status: r.status,
        expiresAt: r.expiresAt,
        daysRemaining: daysUntil(r.expiresAt),
      }));

    return {
      summary: {
        total: report.total,
        expired: report.expired.length,
        expiring: report.expiring.length,
      },
      expired: shape(report.expired),
      expiring: shape(report.expiring),
    };
  });
}
