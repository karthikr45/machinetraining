'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Gauge, Package, XCircle, Clock, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn, formatIndianNumber, round } from '@/lib/utils';
import type { SimTargets } from '@/lib/simulation-shared';

interface LiveStats {
  weight: number;
  hardness: number;
  thickness: number;
  friability: number;
  disintegration: number;
}

interface BatchProgressProps {
  targetTablets: number;
  targets: SimTargets;
  running: boolean;
  durationSeconds?: number;
  onCheckpoint?: (pct: number) => void;
  onComplete?: () => void;
}

const CHECKPOINTS = [20, 40, 60, 80];

function jitter(base: number, amt: number): number {
  return base + (Math.random() - 0.5) * 2 * amt;
}

/** Animated compression run: counter 0→target, live IPQC stats, speed, ETA. */
export function BatchProgress({
  targetTablets,
  targets,
  running,
  durationSeconds = 90,
  onCheckpoint,
  onComplete,
}: BatchProgressProps) {
  const [elapsed, setElapsed] = React.useState(0);
  const [stats, setStats] = React.useState<LiveStats>({
    weight: targets.weight,
    hardness: targets.hardness,
    thickness: targets.thickness,
    friability: 0.3,
    disintegration: 6.5,
  });
  const firedRef = React.useRef<Set<number>>(new Set());
  const completedRef = React.useRef(false);

  const progress = Math.min(1, elapsed / durationSeconds);
  const pct = round(progress * 100, 1);
  const produced = Math.round(progress * targetTablets);
  const rejects = Math.round(produced * 0.0008);
  const speed = running && progress < 1 ? Math.round(targetTablets / durationSeconds / 5) * 5 : 0;
  const etaSeconds = Math.max(0, Math.ceil(durationSeconds - elapsed));

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed((e) => Math.min(durationSeconds, e + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running, durationSeconds]);

  // Jitter live stats roughly every 3s.
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setStats({
        weight: round(jitter(targets.weight, 3.5), 1),
        hardness: round(jitter(targets.hardness, 0.5), 1),
        thickness: round(jitter(targets.thickness, 0.04), 2),
        friability: round(jitter(0.35, 0.12), 2),
        disintegration: round(jitter(6.8, 1.2), 1),
      });
    }, 3000);
    return () => clearInterval(id);
  }, [running, targets]);

  // Fire checkpoints + completion.
  React.useEffect(() => {
    for (const cp of CHECKPOINTS) {
      if (pct >= cp && !firedRef.current.has(cp)) {
        firedRef.current.add(cp);
        onCheckpoint?.(cp);
      }
    }
    if (pct >= 100 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [pct, onCheckpoint, onComplete]);

  const specs: { label: string; value: number; unit: string; ok: boolean }[] = [
    {
      label: 'Avg Weight',
      value: stats.weight,
      unit: 'mg',
      ok: Math.abs(stats.weight - targets.weight) <= targets.weight * 0.05,
    },
    {
      label: 'Hardness',
      value: stats.hardness,
      unit: 'kP',
      ok: stats.hardness >= 5 && stats.hardness <= 8,
    },
    {
      label: 'Thickness',
      value: stats.thickness,
      unit: 'mm',
      ok: Math.abs(stats.thickness - targets.thickness) <= 0.1,
    },
    { label: 'Friability', value: stats.friability, unit: '%', ok: stats.friability <= 1.0 },
    {
      label: 'Disintegration',
      value: stats.disintegration,
      unit: 'min',
      ok: stats.disintegration <= 15,
    },
  ];

  return (
    <div className="space-y-4 rounded-xl border bg-slate-50 p-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
            <Package className="h-3.5 w-3.5" /> Tablets Compressed
          </div>
          <motion.div
            key={produced}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className="font-mono text-3xl font-bold tabular-nums text-pharma-blue"
          >
            {formatIndianNumber(produced)}
          </motion.div>
          <div className="text-xs text-muted-foreground">of {formatIndianNumber(targetTablets)}</div>
        </div>
        <div className="text-right text-sm">
          <div className="flex items-center justify-end gap-1 text-pharma-blue">
            <Gauge className="h-4 w-4" />
            <span className="font-semibold tabular-nums">{formatIndianNumber(speed)}</span>
            <span className="text-xs text-muted-foreground">tabs/min</span>
          </div>
          <div className="mt-1 flex items-center justify-end gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="tabular-nums">ETA {etaSeconds}s</span>
          </div>
        </div>
      </div>

      <div>
        <Progress value={pct} indicatorClassName="bg-pharma-blue" />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" /> {pct}% complete
          </span>
          <span className="flex items-center gap-1 text-pharma-danger">
            <XCircle className="h-3 w-3" /> {formatIndianNumber(rejects)} rejects
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {specs.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-2 text-center">
            <div className="text-[10px] font-medium uppercase text-muted-foreground">{s.label}</div>
            <div
              className={cn(
                'font-mono text-sm font-semibold tabular-nums',
                s.ok ? 'text-pharma-success' : 'text-pharma-danger'
              )}
            >
              {s.value}
              <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
