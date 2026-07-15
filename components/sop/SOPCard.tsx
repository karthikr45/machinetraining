import type { SOPStatus } from '@prisma/client';
import Link from 'next/link';
import { FileText, Calendar, CheckCircle2, Cog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export interface SopCardData {
  id: string;
  sopNumber: string;
  title: string;
  version: string;
  status: SOPStatus;
  machine?: { name: string } | null;
  effectiveDate?: string | Date | null;
  reviewDate?: string | Date | null;
  approvedBy?: string | null;
}

const STATUS_VARIANT: Record<SOPStatus, 'gray' | 'warning' | 'success' | 'destructive'> = {
  DRAFT: 'gray',
  UNDER_REVIEW: 'warning',
  APPROVED: 'success',
  OBSOLETE: 'destructive',
};

const STATUS_LABEL: Record<SOPStatus, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  OBSOLETE: 'Obsolete',
};

export function SOPStatusBadge({ status }: { status: SOPStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function SOPCard({ sop, href }: { sop: SopCardData; href?: string }) {
  const body = (
    <Card className="h-full rounded-xl transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FileText className="h-4 w-4 text-pharma-blue" />
            <span className="truncate">{sop.sopNumber}</span>
            <span className="text-slate-300">•</span>
            <span>v{sop.version}</span>
          </div>
          <CardTitle className="mt-1 truncate text-base">{sop.title}</CardTitle>
        </div>
        <SOPStatusBadge status={sop.status} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Cog className="h-4 w-4 shrink-0" />
          <span className="truncate">{sop.machine?.name ?? 'No machine linked'}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0" />
            Effective: {formatDate(sop.effectiveDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0" />
            Review: {formatDate(sop.reviewDate)}
          </span>
        </div>
        {sop.approvedBy ? (
          <div className="flex items-center gap-1.5 text-pharma-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Approved by {sop.approvedBy}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}
