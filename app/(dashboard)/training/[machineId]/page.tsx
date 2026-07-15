import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import {
  ArrowLeft,
  MessageSquare,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrainingProgress } from '@/components/training/TrainingProgress';
import { ExpiryBadge } from '@/components/training/ExpiryBadge';

export const dynamic = 'force-dynamic';

function stateFor(status: string | undefined) {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Review', badge: 'Completed', variant: 'success' as const, icon: CheckCircle2 };
    case 'IN_PROGRESS':
      return { label: 'Resume', badge: 'In progress', variant: 'teal' as const, icon: Play };
    case 'FAILED':
      return { label: 'Retry', badge: 'Failed', variant: 'destructive' as const, icon: RotateCcw };
    case 'EXPIRED':
      return { label: 'Requalify', badge: 'Expired', variant: 'purple' as const, icon: RotateCcw };
    default:
      return { label: 'Start', badge: 'Not started', variant: 'gray' as const, icon: Play };
  }
}

export default async function MachineTrainingPage({
  params,
}: {
  params: { machineId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const locale = await getLocale();
  const isHi = locale === 'hi';

  const machine = await prisma.machine.findUnique({
    where: { id: params.machineId },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          quiz: { select: { id: true } },
          trainingRecords: {
            where: { userId: user.id },
            select: { status: true, score: true, expiresAt: true },
          },
        },
      },
    },
  });

  if (!machine || machine.companyId !== user.companyId) notFound();

  const latestSop = await prisma.sOPDocument.findFirst({
    where: { machineId: machine.id, status: 'APPROVED' },
    orderBy: { effectiveDate: 'desc' },
    select: { sopNumber: true, version: true },
  });

  const total = machine.modules.length;
  const completed = machine.modules.filter((m) =>
    m.trainingRecords.some((r) => r.status === 'COMPLETED')
  ).length;

  const firstQuizModule = machine.modules.find((m) => m.quiz);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/training">
          <ArrowLeft className="h-4 w-4" />
          All training
        </Link>
      </Button>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{machine.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {machine.type}
                {machine.manufacturer ? ` · ${machine.manufacturer}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                {latestSop
                  ? `SOP ${latestSop.sopNumber} v${latestSop.version}`
                  : 'SOP not linked'}
              </Badge>
              <Badge variant="teal" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                ALCOA+
              </Badge>
            </div>
          </div>
          <TrainingProgress completed={completed} total={total} showSegments />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {firstQuizModule ? (
              <Button asChild variant="outline">
                <Link href={`/training/${machine.id}/quiz?moduleId=${firstQuizModule.id}`}>
                  <ClipboardCheck className="h-4 w-4" />
                  Take quiz
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/training/${machine.id}/chat`}>
                <MessageSquare className="h-4 w-4" />
                Ask AI trainer
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No training modules yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Modules for this machine have not been published. Check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {machine.modules.map((mod, i) => {
            const record = mod.trainingRecords[0];
            const state = stateFor(record?.status);
            const title = isHi && mod.titleHi ? mod.titleHi : mod.title;
            const StateIcon = state.icon;
            return (
              <Card key={mod.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{title}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {mod.moduleType}
                        </Badge>
                        {mod.quiz ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Quiz
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{mod.estimatedMinutes} min</span>
                        <Badge variant={state.variant} className="text-[10px]">
                          {state.badge}
                        </Badge>
                        {record?.status === 'COMPLETED' ? (
                          <ExpiryBadge expiresAt={record.expiresAt} status={record.status} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/training/${machine.id}/${mod.id}`}>
                      <StateIcon className="h-4 w-4" />
                      {state.label}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
