'use client';

import {
  FilePlus2,
  Search,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  PencilLine,
  AlertTriangle,
  Circle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';

export interface CAPAAuditLog {
  id: string;
  action: string;
  changeReason: string | null;
  timestamp: string;
  oldValue?: unknown;
  newValue?: unknown;
  user?: { name: string; role: string } | null;
}

interface CAPATimelineProps {
  createdAt: string;
  createdBy?: string | null;
  auditLogs: CAPAAuditLog[];
}

interface RenderEntry {
  key: string;
  title: string;
  detail?: string | null;
  actor?: string | null;
  timestamp: string;
  Icon: typeof Circle;
  color: string;
}

function statusLabel(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'status' in value) {
    const s = (value as { status?: unknown }).status;
    if (typeof s === 'string') return s.replace(/_/g, ' ');
  }
  return undefined;
}

function describe(log: CAPAAuditLog): RenderEntry {
  const base = {
    key: log.id,
    detail: log.changeReason,
    actor: log.user?.name ?? null,
    timestamp: log.timestamp,
  };
  switch (log.action) {
    case 'STATUS_CHANGE': {
      const to = statusLabel(log.newValue);
      const map: Record<string, { Icon: typeof Circle; color: string }> = {
        INVESTIGATION: { Icon: Search, color: 'text-pharma-blue' },
        'ACTION TAKEN': { Icon: Wrench, color: 'text-pharma-warning' },
        VERIFICATION: { Icon: ShieldCheck, color: 'text-pharma-purple' },
        CLOSED: { Icon: CheckCircle2, color: 'text-pharma-success' },
        OVERDUE: { Icon: AlertTriangle, color: 'text-pharma-danger' },
        OPEN: { Icon: Circle, color: 'text-muted-foreground' },
      };
      const style = (to && map[to]) || { Icon: Circle, color: 'text-muted-foreground' };
      return { ...base, title: to ? `Moved to ${to}` : 'Status changed', ...style };
    }
    case 'REOPEN':
      return { ...base, title: 'Reopened (effectiveness check failed)', Icon: RotateCcw, color: 'text-pharma-danger' };
    case 'UPDATE':
      return { ...base, title: 'Investigation updated', Icon: PencilLine, color: 'text-pharma-blue' };
    case 'CREATE':
      return { ...base, title: 'CAPA created', Icon: FilePlus2, color: 'text-pharma-success' };
    default:
      return { ...base, title: log.action.replace(/_/g, ' '), Icon: Circle, color: 'text-muted-foreground' };
  }
}

export function CAPATimeline({ createdAt, createdBy, auditLogs }: CAPATimelineProps) {
  const hasCreateLog = auditLogs.some((l) => l.action === 'CREATE');

  const entries: RenderEntry[] = [];
  if (!hasCreateLog) {
    entries.push({
      key: 'created',
      title: 'CAPA created',
      detail: null,
      actor: createdBy ?? null,
      timestamp: createdAt,
      Icon: FilePlus2,
      color: 'text-pharma-success',
    });
  }
  for (const log of auditLogs) entries.push(describe(log));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ol className="relative space-y-5 border-l border-border pl-6">
            {entries.map((e) => {
              const Icon = e.Icon;
              return (
                <li key={e.key} className="relative">
                  <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-background">
                    <Icon className={`h-5 w-5 ${e.color}`} />
                  </span>
                  <p className="text-sm font-medium">{e.title}</p>
                  {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDateTime(e.timestamp)}
                    {e.actor ? ` · ${e.actor}` : ''}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
