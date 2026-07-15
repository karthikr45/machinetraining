'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@prisma/client';
import type { SimulationSubmission } from '@/lib/types';
import type { SimSubmitResponse } from '@/lib/simulation-shared';
import { BatchSimulation } from '@/components/simulation/BatchSimulation';

export default function SimulationRunnerPage({ params }: { params: { machineId: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleSubmit = React.useCallback(
    async (submission: SimulationSubmission) => {
      const res = await apiFetch<SimSubmitResponse>('/api/simulation/submit', {
        method: 'POST',
        body: JSON.stringify(submission),
      });
      router.push(`/simulation/${params.machineId}/results?id=${res.id}`);
    },
    [router, params.machineId]
  );

  const handleExit = React.useCallback(() => {
    router.push('/simulation');
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const operatorName = session?.user?.name ?? 'Operator';
  const role = (session?.user?.role as Role | undefined) ?? 'OPERATOR';
  const operatorDesignation = ROLE_LABELS[role] ?? 'Operator';

  return (
    <BatchSimulation
      machineId={params.machineId}
      operatorName={operatorName}
      operatorDesignation={operatorDesignation}
      onSubmit={handleSubmit}
      onExit={handleExit}
    />
  );
}
