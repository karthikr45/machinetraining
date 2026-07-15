import { NextResponse } from 'next/server';
import { requireUser, handle, ApiError } from '@/lib/api-helpers';
import { getAuditTrail } from '@/lib/audit-logger';
import { ROLE_LABELS } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: (string | null | undefined)[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n');
}

/**
 * GET /api/reports/audit-trail
 * Export-friendly audit trail. `?format=csv` streams a CSV download;
 * otherwise returns JSON. Same filters as /api/audit-log.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');

  if (format === 'csv') {
    let user;
    try {
      user = await requireUser();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 500;
      const message = err instanceof Error ? err.message : 'Unauthorized';
      return NextResponse.json({ error: message }, { status });
    }
    const fromRaw = searchParams.get('from');
    const toRaw = searchParams.get('to');
    const from = fromRaw ? new Date(fromRaw) : undefined;
    const to = toRaw ? new Date(toRaw) : undefined;

    const rows = await getAuditTrail({
      companyId: user.companyId,
      userId: searchParams.get('userId') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      action: searchParams.get('action') || undefined,
      from: from && !isNaN(from.getTime()) ? from : undefined,
      to: to && !isNaN(to.getTime()) ? to : undefined,
      take: 500,
    });

    const csv = toCsv(
      ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Old Value', 'New Value', 'Change Reason', 'IP Address'],
      rows.map((r) => [
        formatDateTime(r.timestamp),
        r.user?.name ?? 'System',
        r.user ? ROLE_LABELS[r.user.role] : '',
        r.action,
        r.entityType,
        r.entityId,
        r.oldValue === null ? '' : JSON.stringify(r.oldValue),
        r.newValue === null ? '' : JSON.stringify(r.newValue),
        r.changeReason,
        r.ipAddress,
      ])
    );

    const filename = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return handle(async () => {
    const user = await requireUser();
    const fromRaw = searchParams.get('from');
    const toRaw = searchParams.get('to');
    const from = fromRaw ? new Date(fromRaw) : undefined;
    const to = toRaw ? new Date(toRaw) : undefined;

    const rows = await getAuditTrail({
      companyId: user.companyId,
      userId: searchParams.get('userId') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      action: searchParams.get('action') || undefined,
      from: from && !isNaN(from.getTime()) ? from : undefined,
      to: to && !isNaN(to.getTime()) ? to : undefined,
      take: 500,
    });

    return {
      entries: rows.map((r) => ({
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
      })),
    };
  });
}
