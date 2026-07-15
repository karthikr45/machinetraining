'use client';

import * as React from 'react';
import Link from 'next/link';
import type { MachineStatus } from '@prisma/client';
import { Plus, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MachineCard } from './MachineCard';
import { MACHINE_STATUS_META, type MachineListItem } from './types';

type FilterKey = 'ALL' | MachineStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: MACHINE_STATUS_META.DRAFT.label },
  { key: 'PUBLISHED', label: MACHINE_STATUS_META.PUBLISHED.label },
  { key: 'ARCHIVED', label: MACHINE_STATUS_META.ARCHIVED.label },
];

export function MachineGrid({
  machines,
  canManage,
}: {
  machines: MachineListItem[];
  canManage: boolean;
}) {
  const [filter, setFilter] = React.useState<FilterKey>('ALL');

  const counts = React.useMemo(() => {
    const base: Record<FilterKey, number> = { ALL: machines.length, DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
    for (const m of machines) base[m.status] += 1;
    return base;
  }, [machines]);

  const visible = React.useMemo(
    () => (filter === 'ALL' ? machines : machines.filter((m) => m.status === filter)),
    [machines, filter]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'inline-flex min-h-[36px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
              filter === f.key
                ? 'border-pharma-blue bg-pharma-blue text-white'
                : 'border-input bg-background text-muted-foreground hover:bg-accent'
            )}
            aria-pressed={filter === f.key}
          >
            {f.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs',
                filter === f.key ? 'bg-white/20' : 'bg-muted'
              )}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <PackageOpen className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No machines here yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {filter === 'ALL'
              ? 'Add your first machine to start building training modules and simulations.'
              : `There are no ${filter.toLowerCase()} machines. Try another filter.`}
          </p>
          {canManage && filter === 'ALL' && (
            <Button asChild className="mt-6">
              <Link href="/machines/new">
                <Plus className="h-4 w-4" />
                Add Machine
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((m) => (
            <MachineCard key={m.id} machine={m} />
          ))}
        </div>
      )}
    </div>
  );
}
