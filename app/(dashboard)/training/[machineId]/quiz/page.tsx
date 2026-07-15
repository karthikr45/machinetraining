import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ClipboardX } from 'lucide-react';
import type { RegulatoryFramework } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuizInterface } from '@/components/training/QuizInterface';

export const dynamic = 'force-dynamic';

const FRAMEWORK_LABELS: Record<RegulatoryFramework, string> = {
  FDA_21_CFR: '21 CFR Part 11',
  EU_GMP: 'EU GMP',
  WHO_GMP: 'WHO GMP',
  SCHEDULE_M: 'Schedule M',
  HACCP: 'HACCP',
  ISO_9001: 'ISO 9001',
  IATF_16949: 'IATF 16949',
};

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { machineId: string };
  searchParams: { moduleId?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const machine = await prisma.machine.findUnique({
    where: { id: params.machineId },
    select: {
      id: true,
      name: true,
      companyId: true,
      company: { select: { name: true, regulatoryFramework: true } },
      modules: {
        orderBy: { order: 'asc' },
        select: { id: true, quiz: { select: { id: true } } },
      },
    },
  });

  if (!machine || machine.companyId !== user.companyId) notFound();

  const requested = searchParams.moduleId
    ? machine.modules.find((m) => m.id === searchParams.moduleId && m.quiz)
    : undefined;
  const target = requested ?? machine.modules.find((m) => m.quiz);

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { employeeId: true },
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/training/${machine.id}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to {machine.name}
        </Link>
      </Button>

      {!target ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ClipboardX className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No quiz available</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              None of the modules for this machine have an assessment yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <QuizInterface
          moduleId={target.id}
          machineName={machine.name}
          recipientName={user.name}
          employeeId={account?.employeeId ?? null}
          companyName={machine.company.name}
          framework={FRAMEWORK_LABELS[machine.company.regulatoryFramework]}
        />
      )}
    </div>
  );
}
