'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cog, AlertTriangle, ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import type { DeviationLogEntry } from '@/lib/types';
import { generateTabletReadings, validateInProcessCheck } from '@/lib/simulation-engine';
import { severityToImpact } from '@/lib/simulation-shared';
import { ParameterSlider, ChecklistItem, StageFooter, useFaultQueue } from './controls';
import { FaultAlert } from './FaultAlert';
import { BatchProgress } from './BatchProgress';
import { makeStageResult, type StageProps } from './shared';

const MAX_POINTS = 25;

const TOOLING_OPTIONS = [
  { value: '9mm-b', label: '9 mm round, B-type tooling' },
  { value: '10mm-b', label: '10 mm round, B-type tooling' },
  { value: '12mm-d', label: '12 mm round, D-type tooling' },
];
const CORRECT_TOOLING = '9mm-b';

const INSPECTION = [
  'Punch tips free of wear / burrs',
  'Die bores clean and undamaged',
  'Tooling dimensions match BMR',
];

const PRESTART = [
  'Line clearance completed',
  'BMR available at machine',
  'Hopper charged with qualified granules',
  'Metal detector / de-duster functional',
];

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
  { key: 'turret', label: 'Turret speed', unit: 'rpm', min: 10, max: 60, step: 1, target: 30, tolerance: 8 },
  { key: 'preComp', label: 'Pre-compression force', unit: 'kN', min: 1, max: 12, step: 0.5, target: 5, tolerance: 1.5 },
  { key: 'mainComp', label: 'Main compression force', unit: 'kN', min: 5, max: 30, step: 0.5, target: 15, tolerance: 4 },
  { key: 'feeder', label: 'Feeder speed', unit: 'rpm', min: 10, max: 80, step: 1, target: 40, tolerance: 10 },
  { key: 'weight', label: 'Target tablet weight', unit: 'mg', min: 460, max: 540, step: 1, target: 500, tolerance: 15 },
];

const IPQC_OPTIONS = [
  'Continue — parameters in control',
  'Adjust feeder speed to correct weight CV',
  'Increase main compression force',
  'Stop machine and investigate',
];
const RECO_TO_INDEX: Record<string, number> = {
  continue: 0,
  adjust_feeder: 1,
  increase_force: 2,
  stop: 3,
};

interface IpqcState {
  pct: number;
  readings: { weight: number; hardness: number; thickness: number }[];
  stats: ReturnType<typeof validateInProcessCheck>;
  correctIndex: number;
}

export function Stage3Compression({ config, faults, onComplete }: StageProps) {
  const [tooling, setTooling] = React.useState('');
  const [inspection, setInspection] = React.useState<boolean[]>(() => INSPECTION.map(() => false));
  const [prestart, setPrestart] = React.useState<boolean[]>(() => PRESTART.map(() => false));
  const [params, setParams] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    PARAMS.forEach((p) => (init[p.key] = p.target));
    return init;
  });
  const [started, setStarted] = React.useState(false);
  const [runComplete, setRunComplete] = React.useState(false);
  const [ipqc, setIpqc] = React.useState<IpqcState | null>(null);
  const [ipqcAnswers, setIpqcAnswers] = React.useState<{ pct: number; correct: boolean }[]>([]);
  const [ipqcSelected, setIpqcSelected] = React.useState<number | null>(null);
  const { current, responses, done, resolve, start, remaining } = useFaultQueue(faults);

  const paramsInSpec = PARAMS.filter((p) => Math.abs(params[p.key] - p.target) <= p.tolerance).length;
  const prestartReady = prestart.every(Boolean);
  const running = started && !runComplete && ipqc === null && current === null;

  const toolingScore = tooling === CORRECT_TOOLING ? 2 : 0;
  const inspectionScore = (inspection.filter(Boolean).length / INSPECTION.length) * 2;
  const paramScore = (paramsInSpec / PARAMS.length) * 6;
  const prestartScore = prestartReady ? 3 : (prestart.filter(Boolean).length / PRESTART.length) * 1.5;
  const ipqcCorrect = ipqcAnswers.filter((a) => a.correct).length;
  const ipqcScore = ipqcAnswers.length > 0 ? (ipqcCorrect / 4) * 10 : 0;
  const completionScore = runComplete ? 2 : 0;
  const score = Math.max(
    0,
    Math.min(MAX_POINTS, toolingScore + inspectionScore + paramScore + prestartScore + ipqcScore + completionScore)
  );

  function openIpqc(pct: number) {
    const seed = Math.round(pct) + params.weight;
    const readings = generateTabletReadings(seed, params.weight, config.targets.hardness, config.targets.thickness);
    const stats = validateInProcessCheck(readings.map((r) => r.weight), params.weight);
    setIpqc({ pct, readings, stats, correctIndex: RECO_TO_INDEX[stats.recommendation] ?? 0 });
    setIpqcSelected(null);
  }

  function submitIpqc() {
    if (ipqc === null || ipqcSelected === null) return;
    setIpqcAnswers((prev) => [...prev, { pct: ipqc.pct, correct: ipqcSelected === ipqc.correctIndex }]);
    setIpqc(null);
    setIpqcSelected(null);
  }

  const faultsPending = remaining > 0;
  const canComplete = runComplete && done && ipqcAnswers.length >= 4;

  function complete() {
    const deviations: DeviationLogEntry[] = [];
    responses.forEach((r, i) => {
      const f = faults.find((ff) => ff.id === r.faultId);
      if (f && r.deviationDocumented && r.rootCause) {
        deviations.push({
          id: `DEV-COMP-${i + 1}`,
          stage: 'compression',
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
        'compression',
        MAX_POINTS,
        score,
        {
          tooling,
          toolingCorrect: tooling === CORRECT_TOOLING,
          inspection,
          prestart,
          params,
          inProcessChecks: ipqcAnswers,
          runComplete,
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
        {ipqc && (
          <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-lg overflow-y-auto rounded-xl border bg-card shadow-2xl max-h-[92vh]"
            >
              <div className="border-b p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-pharma-blue">
                  <ClipboardCheck className="h-4 w-4" /> In-Process Check @ {ipqc.pct}%
                </div>
                <p className="text-xs text-muted-foreground">10 tablets sampled — weight uniformity</p>
              </div>
              <div className="space-y-3 p-4">
                <div className="max-h-40 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="text-right">Wt (mg)</TableHead>
                        <TableHead className="text-right">Hard (kP)</TableHead>
                        <TableHead className="text-right">Thk (mm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ipqc.readings.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.weight}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.hardness}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.thickness}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Mean</div>
                    <div className="font-mono font-semibold tabular-nums">{ipqc.stats.mean}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">SD</div>
                    <div className="font-mono font-semibold tabular-nums">{ipqc.stats.sd}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">CV%</div>
                    <div
                      className={cn(
                        'font-mono font-semibold tabular-nums',
                        ipqc.stats.cv <= 2 ? 'text-pharma-success' : 'text-pharma-danger'
                      )}
                    >
                      {ipqc.stats.cv}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium">What is the correct action?</p>
                <div className="space-y-2">
                  {IPQC_OPTIONS.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIpqcSelected(i)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-sm min-h-[44px]',
                        ipqcSelected === i ? 'border-pharma-blue bg-pharma-blue/5' : 'hover:bg-accent'
                      )}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
                <Button className="w-full" disabled={ipqcSelected === null} onClick={submitIpqc}>
                  Record Decision & Resume
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5 text-pharma-blue" /> Tablet Compression
          </CardTitle>
          <CardDescription>Set up tooling and parameters, then run the batch with in-process control.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!started ? (
            <>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Tooling selection</h4>
                <Select value={tooling} onValueChange={setTooling}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tooling for this product" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOLING_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tooling && tooling !== CORRECT_TOOLING && (
                  <p className="flex items-center gap-1 text-xs text-pharma-warning">
                    <AlertTriangle className="h-3.5 w-3.5" /> Verify tooling against the BMR specification.
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Tooling inspection</h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  {INSPECTION.map((c, i) => (
                    <ChecklistItem
                      key={c}
                      id={`insp-${i}`}
                      label={c}
                      checked={inspection[i]}
                      onCheckedChange={(v) => {
                        const next = [...inspection];
                        next[i] = v;
                        setInspection(next);
                      }}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold">Compression parameters</h4>
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

              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Pre-start checklist (all required)</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PRESTART.map((c, i) => (
                    <ChecklistItem
                      key={c}
                      id={`prestart-${i}`}
                      label={c}
                      checked={prestart[i]}
                      onCheckedChange={(v) => {
                        const next = [...prestart];
                        next[i] = v;
                        setPrestart(next);
                      }}
                    />
                  ))}
                </div>
              </section>

              <Button
                size="lg"
                className="w-full"
                disabled={!prestartReady || !tooling}
                onClick={() => setStarted(true)}
              >
                {prestartReady && tooling ? 'Start Compression' : 'Complete setup to start'}
              </Button>
            </>
          ) : (
            <>
              <BatchProgress
                targetTablets={config.batchSize}
                targets={{ ...config.targets, weight: params.weight }}
                running={running}
                onCheckpoint={openIpqc}
                onComplete={() => setRunComplete(true)}
              />

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={ipqcAnswers.length >= 4 ? 'success' : 'secondary'}>
                  IPQC checks {ipqcAnswers.length}/4
                </Badge>
                <span>Correct decisions: {ipqcCorrect}/{ipqcAnswers.length || 0}</span>
              </div>

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
                    {faultsPending ? (
                      <>
                        <XCircle className="h-4 w-4 text-pharma-danger" />
                        {remaining} process alert{remaining > 1 ? 's' : ''} to resolve
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-pharma-success" /> All alerts handled
                      </>
                    )}
                  </span>
                  {faultsPending && (
                    <Button size="sm" variant="destructive" onClick={start}>
                      Handle Alert
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {started && (
        <StageFooter
          stageTitle="Compression"
          score={score}
          maxPoints={MAX_POINTS}
          disabled={!canComplete}
          disabledReason={
            !canComplete ? 'Finish the run, complete all 4 IPQC checks and resolve alerts' : undefined
          }
          onComplete={complete}
        />
      )}
    </div>
  );
}
