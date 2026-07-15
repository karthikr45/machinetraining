'use client';

import * as React from 'react';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIMULATION_STAGES } from '@/lib/types';

interface StageNavigatorProps {
  currentStageIndex: number;
  completedCount: number;
}

/** Six stage tabs showing completed / current / locked states. */
export function StageNavigator({ currentStageIndex, completedCount }: StageNavigatorProps) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {SIMULATION_STAGES.map((s, i) => {
        const done = i < completedCount;
        const active = i === currentStageIndex;
        const locked = i > currentStageIndex;
        return (
          <div
            key={s.key}
            className={cn(
              'relative rounded-lg border p-2 text-center transition-colors',
              done && 'border-pharma-success/40 bg-pharma-success/5',
              active && !done && 'border-pharma-blue bg-pharma-blue/5 ring-1 ring-pharma-blue',
              locked && 'border-dashed opacity-60'
            )}
          >
            <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
              {done ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pharma-success text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : locked ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                  <Lock className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pharma-blue text-white">
                  {s.order}
                </span>
              )}
            </div>
            <div
              className={cn(
                'text-[11px] font-medium leading-tight',
                active && 'text-pharma-blue',
                locked && 'text-muted-foreground'
              )}
            >
              {s.title}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">{s.maxPoints} pts</div>
          </div>
        );
      })}
    </div>
  );
}
