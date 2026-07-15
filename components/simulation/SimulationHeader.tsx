'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, LogOut, Timer, Gauge, Package, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatIndianNumber } from '@/lib/utils';
import { SIMULATION_STAGES } from '@/lib/types';

interface SimulationHeaderProps {
  batchNumber: string;
  productName: string;
  operatorName: string;
  targetTablets: number;
  runningScore: number;
  currentStageIndex: number;
  elapsedSeconds: number;
  paused: boolean;
  onTogglePause: () => void;
  onExit: () => void;
}

function formatClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SimulationHeader({
  batchNumber,
  productName,
  operatorName,
  targetTablets,
  runningScore,
  currentStageIndex,
  elapsedSeconds,
  paused,
  onTogglePause,
  onExit,
}: SimulationHeaderProps) {
  const scoreColor =
    runningScore >= 75 ? 'text-pharma-success' : runningScore >= 50 ? 'text-pharma-warning' : 'text-pharma-danger';

  return (
    <div className="sticky top-0 z-40 -mx-4 mb-4 border-b bg-card/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-pharma-blue">
            <Package className="h-4 w-4 shrink-0" />
            <span className="truncate">{batchNumber}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="truncate">{productName}</span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <User className="h-3 w-3" /> {operatorName}
            </span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3" /> {formatIndianNumber(targetTablets)} tablets
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-center">
            <div className="flex items-center gap-1 text-[10px] font-medium uppercase text-muted-foreground">
              <Timer className="h-3 w-3" /> Time
            </div>
            <div className="font-mono text-base font-semibold tabular-nums">
              {formatClock(elapsedSeconds)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-[10px] font-medium uppercase text-muted-foreground">
              <Gauge className="h-3 w-3" /> Score
            </div>
            <div className={cn('font-mono text-base font-semibold tabular-nums', scoreColor)}>
              {Math.round(runningScore)}
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onTogglePause} className="h-9 px-3">
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span className="hidden sm:inline">{paused ? 'Resume' : 'Pause'}</span>
          </Button>
          <Button size="sm" variant="destructive" onClick={onExit} className="h-9 px-3">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        {SIMULATION_STAGES.map((s, i) => {
          const done = i < currentStageIndex;
          const active = i === currentStageIndex;
          return (
            <div key={s.key} className="flex flex-1 items-center gap-1.5">
              <motion.span
                animate={active ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ repeat: active ? Infinity : 0, duration: 1.6 }}
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  done && 'bg-pharma-success',
                  active && 'bg-pharma-blue',
                  !done && !active && 'bg-slate-300'
                )}
                title={s.title}
              />
              {i < SIMULATION_STAGES.length - 1 && (
                <span
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    done ? 'bg-pharma-success' : 'bg-slate-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
