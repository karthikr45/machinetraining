'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';

export interface AffectedOperator {
  id: string;
  name: string;
}

export function AffectedOperatorsAlert({
  sopId,
  operators,
  canAssign,
}: {
  sopId: string;
  operators: AffectedOperator[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  if (operators.length === 0) return null;

  async function assignAll() {
    setBusy(true);
    try {
      await apiFetch(`/api/sop/${sopId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ assignRetraining: true }),
      });
      setDone(true);
      toast({
        title: 'Retraining assigned',
        description: `Requalification created for ${operators.length} operator(s).`,
      });
      router.refresh();
    } catch (err) {
      toast({ title: 'Failed to assign retraining', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-pharma-warning/40 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-pharma-warning" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-900">
            {operators.length} operator{operators.length === 1 ? '' : 's'} trained on the previous version
            need retraining
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            These operators hold a completed certification on this machine and should requalify against
            the newly approved SOP version.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {operators.map((o) => (
              <li
                key={o.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200"
              >
                <Users className="h-3.5 w-3.5" />
                {o.name}
              </li>
            ))}
          </ul>
          {canAssign ? (
            <Button className="mt-4" variant="warning" onClick={assignAll} disabled={busy || done}>
              <RefreshCw className="h-4 w-4" />
              {done ? 'Retraining assigned' : busy ? 'Assigning…' : 'Assign retraining to all'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
