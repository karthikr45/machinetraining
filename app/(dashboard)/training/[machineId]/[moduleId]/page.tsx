import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ModuleContent as ModuleContentType } from '@/lib/types';
import { ModulePlayer } from '@/components/training/ModulePlayer';

export const dynamic = 'force-dynamic';

export default async function ModulePage({
  params,
}: {
  params: { machineId: string; moduleId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const moduleRecord = await prisma.trainingModule.findUnique({
    where: { id: params.moduleId },
    include: {
      machine: { select: { id: true, name: true, companyId: true } },
      quiz: { select: { id: true } },
      trainingRecords: {
        where: { userId: user.id },
        select: { status: true, expiresAt: true },
      },
    },
  });

  if (
    !moduleRecord ||
    moduleRecord.machineId !== params.machineId ||
    moduleRecord.machine.companyId !== user.companyId
  ) {
    notFound();
  }

  const record = moduleRecord.trainingRecords[0];
  const content = moduleRecord.content as unknown as ModuleContentType;
  const contentHi = (moduleRecord.contentHi as unknown as ModuleContentType | null) ?? null;

  return (
    <ModulePlayer
      machineId={moduleRecord.machine.id}
      machineName={moduleRecord.machine.name}
      moduleId={moduleRecord.id}
      title={moduleRecord.title}
      titleHi={moduleRecord.titleHi}
      content={content}
      contentHi={contentHi}
      hasQuiz={Boolean(moduleRecord.quiz)}
      initialStatus={record?.status ?? 'NOT_STARTED'}
      expiresAt={record?.expiresAt ? record.expiresAt.toISOString() : null}
      estimatedMinutes={moduleRecord.estimatedMinutes}
      sopVersion={moduleRecord.sopVersion}
    />
  );
}
