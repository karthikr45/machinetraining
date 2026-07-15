'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc3, Play, AlertTriangle, Eye, CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { cn, round } from '@/lib/utils';
import type { DeviationLogEntry } from '@/lib/types';
import { severityToImpact } from '@/lib/simulation-shared';
import { ParameterSlider, ChecklistItem, StageFooter, useFaultQueue } from './controls';
import { FaultAlert } from './FaultAlert';
import { makeStageResult, type StageProps } from './shared';

const MAX_POINTS = 15;
const TARGET_GAIN = 3.0;

interface Param {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  target: number;
  tolerance: number;
}
const PARAMS: Param[] = [
  { key: 'inlet', label: 'Inlet air temperature', unit: '°C', min: 40, max: 80, step: 1, target: 60, tolerance: 8 },
  { key: 'outlet', label: 'Outlet air temperature', unit: '°C', min: 30, max: 55, step: 1, target: 42, tolerance: 6 },
  { key: 'panSpeed', label: 'Pan speed', unit: 'rpm', min: 2, max: 20, step: 1, target: 8, tolerance: 3 },
  { key: 'spray', label: 'Spray rate', unit: 'g/min', min: 40, max: 250, step: 5, target: 120, tolerance: 40 },
  { key: 'atom', label: 'Atomization pressure', unit: 'bar', min: 1, max: 5, step: 0.1, target: 2.5, tolerance: 0.8 },
  { key: 'gun', label: 'Gun-to-bed distance', unit: 'cm', min: 10, max: 35, step: 1, target: 20, tolerance: 5 },
];

const APPEARANCE_OPTIONS = [
  { value: 'ok', label: 'Uniform, smooth, logo sharp — Acceptable' },
  { value: 'bridging', label: 'Logo bridging observed' },
  { value: 'twinning', label: 'Twinning / picking observed' },
  { value: 'rough', label: 'Rough / orange-peel surface' },
];
const APPEARANCE_CHECKPOINTS = [1.5, 3.0];

export function Stage4Coating({ config, faults, onComplete }: StageProps) {
  const [prepared, setPrepared] = React.useState(false);
  const [loaded, setLoaded] = React.useState<boolean[]>([false, false]);
  const [params, setParams] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    PARAMS.forEach((p) => (init[p.key] = p.target));
    return init;
  });
  const [running, setRunning] = React.useState(false);
  const [gain, setGain] = React.useState(0);
  const [appearance, setAppearance] = React.useState<Record<number, string>>({});
  const [pendingCheck, setPendingCheck] = React.useState<number | null>(null);
  const firedRef = React.useRef<Set<number>>(new Set());
  const { current, responses, done, resolve, start, remaining } = useFaultQueue(faults);

  const solids = config.coatingFormula
    .filter((m) => !/water/i.test(m.material))
    .reduce((s, m) => s + m.target, 0);
  const totalSolution = config.coatingFormula.reduce((s, m) => s + m.target, 0);
  const solidsPct = round((solids / totalSolution) * 100, 1);

  const paramsInSpec = PARAMS.filter((p) => Math.abs(params[p.key] - p.target) <= p.tolerance).length;
  const subBatch = gain < 1.5 ? 1 : 2;
  const runActive = running && current === null && pendingCheck === null && gain < TARGET_GAIN;

  React.useEffect(() => {
    if (!runActive) return;
    const id = setInterval(() => {
      setGain((g) => {
        const next = round(Math.min(TARGET_GAIN, g + 0.15 + Math.random() * 0.1), 2);
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, [runActive]);

  // Trigger appearance checkpoints.
  React.useEffect(() => {
    for (const cp of APPEARANCE_CHECKPOINTS) {
      if (gain >= cp && !firedRef.current.has(cp)) {
        firedRef.current.add(cp);
        setPendingCheck(cp);
      }
    }
  }, [gain]);

  const runComplete = gain >= TARGET_GAIN;
  const appearanceDone = APPEARANCE_CHECKPOINTS.every((c) => appearance[c]);
  const appearanceCorrect = APPEARANCE_CHECKPOINTS.filter((c) => appearance[c] === 'ok').length;

  const paramScore = (paramsInSpec / PARAMS.length) * 5;
  const solidsScore = solidsPct >= 5 && solidsPct <= 9 ? 2 : 0;
  const gainScore = runComplete ? 4 : (gain / TARGET_GAIN) * 4;
  const appearanceScore = (appearanceCorrect / APPEARANCE_CHECKPOINTS.length) * 4;
  const score = Math.max(0, Math.min(MAX_POINTS, paramScore + solidsScore + gainScore + appearanceScore));

  const faultsPending = remaining > 0;
  const canComplete = runComplete && appearanceDone && done;

  function complete() {
    const deviations: DeviationLogEntry[] = [];
    responses.forEach((r, i) => {
      const f = faults.find((ff) => ff.id === r.faultId);
      if (f && r.deviationDocumented && r.rootCause) {
        deviations.push({
          id: `DEV-COAT-${i + 1}`,
          stage: 'coating',
          deviation: f.title,
          rootCause: r.rootCause,
          action: r.actionTaken ?? '—',
          impact: severityToImpact(f.severity),
          severity: f.severity,
        });
      }
    });
    onComplete(
      makeStageResult(
        'coating',
        MAX_POINTS,
        score,
        {
          params,
          solution: { solids, totalSolution, solidsPct },
          weightGain: gain,
          appearance,
          subBatches: 2,
        },
        deviations
      ),
      responses
    );
  }

  return (
    <div className="space-y-4">
      {current && <FaultAlert fault={current} onResolved={resolve} />}

      <AnimatePresence>
        {pendingCheck !== null && (
          <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-md rounded-xl border bg-card p-4 shadow-2xl"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-pharma-blue">
                <Eye className="h-4 w-4" /> Appearance check @ {pendingCheck}% weight gain
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Inspect a sample of coated tablets and record the appearance.
              </p>
              <Select
                value={appearance[pendingCheck] ?? ''}
                onValueChange={(v) => setAppearance((prev) => ({ ...prev, [pendingCheck]: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select observation" />
                </SelectTrigger>
                <SelectContent>
                  {APPEARANCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="mt-3 w-full"
                disabled={!appearance[pendingCheck]}
                onClick={() => setPendingCheck(null)}
              >
                Record & Continue
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-pharma-blue" /> Film Coating
          </CardTitle>
          <CardDescription>Coat the batch in 2 sub-batches to a target {TARGET_GAIN}% weight gain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={running ? { rotate: 360 } : { rotate: 0 }}
              transition={{ repeat: running ? Infinity : 0, duration: 3, ease: 'linear' }}
              className="relative flex h-32 w-32 items-center justify-center rounded-full border-8 border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200"
            >
              <div className="absolute bottom-4 h-10 w-24 rounded-full bg-pink-300/70" />
              <Disc3 className="h-8 w-8 text-slate-500" />
            </motion.div>
            <div className="text-center">
              <div className="text-xs uppercase text-muted-foreground">Weight gain — Sub-batch {subBatch}/2</div>
              <div
                className={cn(
                  'font-mono text-2xl font-bold tabular-nums',
                  runComplete ? 'text-pharma-success' : 'text-pharma-blue'
                )}
              >
                {gain.toFixed(2)}%
              </div>
            </div>
            <div className="w-full max-w-sm">
              <Progress
                value={(gain / TARGET_GAIN) * 100}
                indicatorClassName={runComplete ? 'bg-pharma-success' : 'bg-pharma-blue'}
              />
            </div>
          </div>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Sub-batch loading</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {loaded.map((l, i) => (
                <ChecklistItem
                  key={i}
                  id={`load-${i}`}
                  label={`Sub-batch ${i + 1} loaded into pan`}
                  checked={l}
                  onCheckedChange={(v) => {
                    const next = [...loaded];
                    next[i] = v;
                    setLoaded(next);
                  }}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Coating solution</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.coatingFormula.map((m) => (
                    <TableRow key={m.material}>
                      <TableCell>{m.material}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.target} {/water/i.test(m.material) ? 'g' : 'g'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-sm">
              <span className="font-medium">Solids content</span>
              <span
                className={cn(
                  'font-mono font-semibold tabular-nums',
                  solidsScore ? 'text-pharma-success' : 'text-pharma-warning'
                )}
              >
                {solidsPct}% w/w
              </span>
            </div>
            <ChecklistItem
              id="soln-prepared"
              label="Solution prepared, mixed and homogeneous"
              checked={prepared}
              onCheckedChange={setPrepared}
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Process parameters</h4>
            {PARAMS.map((p) => (
              <ParameterSlider
                key={p.key}
                label={p.label}
                unit={p.unit}
                value={params[p.key]}
                onChange={(v) => setParams((prev) => ({ ...prev, [p.key]: v }))}
                min={p.min}
                max={p.max}
                step={p.step}
                target={p.target}
                tolerance={p.tolerance}
              />
            ))}
          </section>

          {!runComplete ? (
            <Button
              size="lg"
              className="w-full"
              variant={running ? 'outline' : 'default'}
              disabled={!prepared || !loaded.every(Boolean)}
              onClick={() => setRunning((r) => !r)}
            >
              <Play className="h-4 w-4" />
              {running ? 'Pause Coating' : gain > 0 ? 'Resume Coating' : 'Start Coating'}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-pharma-success/40 bg-pharma-success/5 p-3 text-sm font-medium text-pharma-success">
              <CheckCircle2 className="h-4 w-4" /> Target weight gain achieved — coating complete
            </div>
          )}

          {faults.length > 0 && (
            <div
              className={cn(
                'flex items-center justify-between rounded-lg border p-3',
                faultsPending
                  ? 'border-pharma-danger/40 bg-pharma-danger/5'
                  : 'border-pharma-success/40 bg-pharma-success/5'
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className={cn('h-4 w-4', faultsPending ? 'text-pharma-danger' : 'text-pharma-success')} />
                {faultsPending ? `${remaining} process alert pending` : 'All process alerts handled'}
              </span>
              {faultsPending && (
                <Button size="sm" variant="destructive" onClick={start}>
                  Handle Alert
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <StageFooter
        stageTitle="Coating"
        score={score}
        maxPoints={MAX_POINTS}
        disabled={!canComplete}
        disabledReason={!canComplete ? 'Reach target gain, record appearance checks and resolve alerts' : undefined}
        onComplete={complete}
      />
    </div>
  );
}
