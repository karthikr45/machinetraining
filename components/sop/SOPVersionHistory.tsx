import type { SOPStatus } from '@prisma/client';
import { GitBranch, CheckCircle2, FileText } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { SOPStatusBadge } from './SOPCard';

export interface SopVersionEntry {
  id: string;
  version: string;
  status: SOPStatus;
  changeReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | Date | null;
  effectiveDate?: string | Date | null;
  createdAt: string | Date;
}

export function SOPVersionHistory({
  versions,
  currentId,
}: {
  versions: SopVersionEntry[];
  currentId: string;
}) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">No version history available.</p>;
  }

  // Newest first for display.
  const ordered = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6">
      {ordered.map((v) => {
        const isCurrent = v.id === currentId;
        return (
          <li key={v.id} className="relative">
            <span
              className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                v.status === 'APPROVED' ? 'bg-pharma-success' : 'bg-pharma-blue'
              }`}
            >
              {v.status === 'APPROVED' ? (
                <CheckCircle2 className="h-3 w-3 text-white" />
              ) : (
                <FileText className="h-3 w-3 text-white" />
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                Version {v.version}
              </span>
              <SOPStatusBadge status={v.status} />
              {isCurrent ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Viewing
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Created {formatDateTime(v.createdAt)}
            </p>
            {v.changeReason ? (
              <p className="mt-1 text-sm">
                <span className="font-medium">Change reason: </span>
                {v.changeReason}
              </p>
            ) : null}
            {v.approvedBy ? (
              <p className="mt-1 text-sm text-pharma-success">
                Approved by {v.approvedBy} on {formatDate(v.approvedAt)}
              </p>
            ) : null}
            {v.effectiveDate ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Effective {formatDate(v.effectiveDate)}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
