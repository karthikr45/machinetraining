import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Download, History, ClipboardList, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SOPCard, type SopCardData } from '@/components/sop/SOPCard';
import { SOPVersionHistory, type SopVersionEntry } from '@/components/sop/SOPVersionHistory';
import { SOPApprovalFlow } from '@/components/sop/SOPApprovalFlow';
import { AffectedOperatorsAlert, type AffectedOperator } from '@/components/sop/AffectedOperatorsAlert';

export default async function SOPDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const sop = await prisma.sOPDocument.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: {
      machine: { select: { id: true, name: true } },
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        take: 50,
        include: { user: { select: { name: true, role: true } } },
      },
    },
  });
  if (!sop) notFound();

  const versionHistory = await prisma.sOPDocument.findMany({
    where: { companyId: user.companyId, sopNumber: sop.sopNumber },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      version: true,
      status: true,
      changeReason: true,
      approvedBy: true,
      approvedAt: true,
      effectiveDate: true,
      createdAt: true,
    },
  });

  // Affected operators (trained on the machine) — surfaced once approved.
  let affectedOperators: AffectedOperator[] = [];
  if (sop.status === 'APPROVED' && sop.machineId) {
    const records = await prisma.trainingRecord.findMany({
      where: {
        machineId: sop.machineId,
        status: 'COMPLETED',
        user: { companyId: user.companyId },
      },
      select: { userId: true, user: { select: { id: true, name: true } } },
      distinct: ['userId'],
    });
    affectedOperators = records.map((r) => ({ id: r.user.id, name: r.user.name }));
  }

  const canManage = isManager(user.role);
  const cardData: SopCardData = {
    id: sop.id,
    sopNumber: sop.sopNumber,
    title: sop.title,
    version: sop.version,
    status: sop.status,
    machine: sop.machine,
    effectiveDate: sop.effectiveDate,
    reviewDate: sop.reviewDate,
    approvedBy: sop.approvedBy,
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/sop">
            <ArrowLeft className="h-4 w-4" /> Back to SOP Library
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{sop.title}</h1>
          {sop.filePath ? (
            <Button asChild variant="outline">
              <a href={sop.filePath} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-4 w-4" /> Download Document
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <SOPCard sop={cardData} />

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-pharma-blue" /> Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SOPApprovalFlow
            sopId={sop.id}
            status={sop.status}
            canApprove={canManage}
            canManage={canManage}
          />
          {sop.status === 'APPROVED' ? (
            <AffectedOperatorsAlert
              sopId={sop.id}
              operators={affectedOperators}
              canAssign={canManage}
            />
          ) : null}
          {sop.changeReason ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Latest change reason: </span>
              {sop.changeReason}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-pharma-blue" /> Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SOPVersionHistory
            versions={versionHistory as unknown as SopVersionEntry[]}
            currentId={sop.id}
          />
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-pharma-blue" /> Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sop.auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <ul className="space-y-3">
              {sop.auditLogs.map((log) => (
                <li key={log.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">
                    by {log.user?.name ?? 'System'} · {formatDateTime(log.timestamp)}
                  </span>
                  {log.changeReason ? (
                    <span className="w-full text-muted-foreground">{log.changeReason}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
