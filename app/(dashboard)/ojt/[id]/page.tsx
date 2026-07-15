import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ClipboardList, PenLine } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OJTSummary } from '@/components/ojt/OJTSummary';
import { OJTChecklist } from '@/components/ojt/OJTChecklist';
import { OJTSignOff } from '@/components/ojt/OJTSignOff';
import type { OJTChecklistItem } from '@/lib/types';

type Result = 'PASS' | 'FAIL' | 'PENDING';

export default async function OJTDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const record = await prisma.oJTRecord.findFirst({
    where: { id: params.id, trainee: { companyId: user.companyId } },
    include: {
      trainee: { select: { id: true, name: true } },
      trainer: { select: { id: true, name: true } },
      machine: { select: { id: true, name: true } },
    },
  });
  if (!record) notFound();

  const isTrainerOfRecord = record.trainerId === user.id;
  const isTraineeOfRecord = record.traineeId === user.id;
  const mgr = isManager(user.role);
  if (!mgr && !isTrainerOfRecord && !isTraineeOfRecord) notFound();

  const checklist = record.checklist as unknown as OJTChecklistItem[];
  const canAssess = mgr || isTrainerOfRecord;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/ojt">
            <ArrowLeft className="h-4 w-4" /> Back to OJT
          </Link>
        </Button>
      </div>

      <OJTSummary
        record={{
          trainee: record.trainee,
          trainer: record.trainer,
          machine: record.machine,
          sopVersion: record.sopVersion,
          overallResult: record.overallResult,
          conductedAt: record.conductedAt,
          locked: record.locked,
        }}
      />

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-pharma-blue" /> Assessment Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OJTChecklist
            items={checklist}
            recordId={record.id}
            disabled={record.locked}
            overallResult={record.overallResult as Result}
            trainerComments={record.trainerComments}
            traineeComments={record.traineeComments}
            canAssess={canAssess}
            canComment={isTraineeOfRecord}
          />
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="h-5 w-5 text-pharma-blue" /> Electronic Sign-off
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OJTSignOff
            recordId={record.id}
            trainerName={record.trainer.name}
            traineeName={record.trainee.name}
            trainerSignedAt={record.trainerSignedAt}
            traineeSignedAt={record.traineeSignedAt}
            locked={record.locked}
            canSignTrainer={isTrainerOfRecord}
            canSignTrainee={isTraineeOfRecord}
          />
        </CardContent>
      </Card>
    </div>
  );
}
