'use client';

import { Lock } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  changeReason: string | null;
  ipAddress: string | null;
  userName: string;
  userRole: string;
}

function actionVariant(action: string): 'success' | 'warning' | 'destructive' | 'purple' | 'secondary' {
  const a = action.toUpperCase();
  if (['CREATE', 'SIGN', 'MACHINE_CREATED'].some((x) => a.includes(x))) return 'success';
  if (['UPDATE', 'STATUS_CHANGE', 'ASSIGN'].some((x) => a.includes(x))) return 'warning';
  if (['DELETE', 'EXPIRE', 'FAIL', 'REOPEN'].some((x) => a.includes(x))) return 'destructive';
  if (['LOCK', 'REQUALIFICATION'].some((x) => a.includes(x))) return 'purple';
  return 'secondary';
}

function renderJson(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/** Reusable immutable audit-trail table. */
export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Timestamp</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Old</TableHead>
          <TableHead>New</TableHead>
          <TableHead>Change Reason</TableHead>
          <TableHead>IP</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="whitespace-nowrap font-mono text-xs">
              {formatDateTime(e.timestamp)}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <div className="font-medium">{e.userName}</div>
              <div className="text-xs text-muted-foreground">{e.userRole}</div>
            </TableCell>
            <TableCell>
              <Badge variant={actionVariant(e.action)}>{e.action}</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <div className="font-medium">{e.entityType}</div>
              <div className="max-w-[10rem] truncate font-mono text-xs text-muted-foreground">
                {e.entityId}
              </div>
            </TableCell>
            <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground" title={renderJson(e.oldValue)}>
              {renderJson(e.oldValue)}
            </TableCell>
            <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground" title={renderJson(e.newValue)}>
              {renderJson(e.newValue)}
            </TableCell>
            <TableCell className="max-w-[12rem] truncate text-sm" title={e.changeReason ?? ''}>
              {e.changeReason ?? '—'}
            </TableCell>
            <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
              {e.ipAddress ?? '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Small immutability notice used alongside the audit table. */
export function ImmutabilityNotice() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="h-3.5 w-3.5" />
      Audit records are immutable — they can never be edited or deleted (ALCOA+ Enduring).
    </p>
  );
}
