import { requireUser, handle } from '@/lib/api-helpers';
import { getAuditTrail } from '@/lib/audit-logger';
import { ROLE_LABELS } from '@/lib/types';

/**
 * GET /api/audit-log
 * Immutable audit trail scoped to the caller's company.
 * Filters: ?from= ?to= ?userId= ?entityType= ?action= ?take= ?skip=
 */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);

    const fromRaw = searchParams.get('from');
    const toRaw = searchParams.get('to');
    const from = fromRaw ? new Date(fromRaw) : undefined;
    const to = toRaw ? new Date(toRaw) : undefined;
    const takeRaw = Number(searchParams.get('take'));
    const skipRaw = Number(searchParams.get('skip'));

    const rows = await getAuditTrail({
      companyId: user.companyId,
      userId: searchParams.get('userId') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      action: searchParams.get('action') || undefined,
      from: from && !isNaN(from.getTime()) ? from : undefined,
      to: to && !isNaN(to.getTime()) ? to : undefined,
      take: Number.isFinite(takeRaw) && takeRaw > 0 ? Math.min(Math.trunc(takeRaw), 500) : 200,
      skip: Number.isFinite(skipRaw) && skipRaw > 0 ? Math.trunc(skipRaw) : 0,
    });

    const entries = rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      oldValue: r.oldValue,
      newValue: r.newValue,
      changeReason: r.changeReason,
      ipAddress: r.ipAddress,
      userName: r.user?.name ?? 'System',
      userRole: r.user ? ROLE_LABELS[r.user.role] : '—',
    }));

    return { entries, count: entries.length };
  });
}
