import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSimulationFeedback } from '@/lib/claude';
import { SimulationResults, type ResultFault } from '@/components/simulation/SimulationResults';
import type { FaultResponse, StageKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface InjectedFault {
  id: string;
  stage: StageKey;
  title: string;
  severity: ResultFault['severity'];
  correctAnswer: number;
}

interface Reconciliation {
  input: number;
  tabletsProduced: number;
  rejects: number;
  samples: number;
  coatingLoss: number;
  yieldPct: number;
}

export default async function SimulationResultsPage({
  params,
  searchParams,
}: {
  params: { machineId: string };
  searchParams: { id?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const id = searchParams.id;
  if (!id) notFound();

  const record = await prisma.simulationRecord.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, companyId: true } } },
  });

  if (!record || record.user.companyId !== user.companyId) notFound();
  const isOwner = record.userId === user.id;
  if (!isOwner && !isManager(user.role)) notFound();

  const [machine, attempts] = await Promise.all([
    prisma.machine.findUnique({ where: { id: record.machineId }, select: { name: true } }),
    prisma.simulationRecord.count({ where: { userId: record.userId, machineId: record.machineId } }),
  ]);

  const stageScores = (record.stageScores as Record<string, number>) ?? {};
  const injected = (record.faultsInjected as unknown as InjectedFault[]) ?? [];
  const responses = (record.faultResponses as unknown as FaultResponse[]) ?? [];
  const bmrData = (record.bmrData as unknown as { reconciliation?: Reconciliation }) ?? {};

  const responseById = new Map(responses.map((r) => [r.faultId, r]));
  const faults: ResultFault[] = injected.map((f) => {
    const resp = responseById.get(f.id);
    return {
      id: f.id,
      stage: f.stage,
      title: f.title,
      severity: f.severity,
      correctAnswer: f.correctAnswer,
      selectedOption: resp?.selectedOption ?? -1,
      correct: resp?.correct ?? false,
    };
  });

  const feedback = await generateSimulationFeedback({
    totalScore: record.totalScore,
    passed: record.passed,
    stageScores,
    deviations: Array.isArray((bmrData as { deviations?: unknown[] }).deviations)
      ? ((bmrData as { deviations?: unknown[] }).deviations as unknown[]).length
      : 0,
    faultsCorrect: faults.filter((f) => f.correct).length,
    faultsTotal: faults.length,
  });

  return (
    <SimulationResults
      id={record.id}
      machineId={record.machineId}
      machineName={machine?.name ?? 'Manufacturing Equipment'}
      batchNumber={record.batchNumber}
      totalScore={record.totalScore}
      passed={record.passed}
      attempts={attempts}
      stageScores={stageScores}
      faults={faults}
      feedback={feedback}
      certificateUrl={record.certificateUrl}
      reconciliation={bmrData.reconciliation}
    />
  );
}
