'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Waves, FlaskConical, AlertTriangle, Beaker } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn, round } from '@/lib/utils';
import type { DeviationLogEntry } from '@/lib/types';
import { severityToImpact } from '@/lib/simulation-shared';
import { ParameterSlider, ChecklistItem, StageFooter, useFaultQueue } from './controls';
import { FaultAlert } from './FaultAlert';
import { makeStageResult, type StageProps } from './shared';

const MAX_POINTS = 15;

const PRE_CHECKS = [
  'RMG bowl cleaned and line clearance verified',
  'Correct dispensed materials charged',
  'Binder solution vessel ready',
  'Interlocks and guards functional',
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
  init: number;
}

const DRY_PARAMS: Param[] = [
  { key: 'dryImpeller', label: 'Impeller speed', unit: 'rpm', min: 50, max: 300, step: 5, target: 150, tolerance: 40, init: 150 },
  { key: 'chopper', label: 'Chopper speed', unit: 'rpm', min: 0, max: 3000, step: 50, target: 1500, tolerance: 500, init: 1500 },
  { key: 'dryTime', label: 'Dry mix time', unit: 'min', min: 1, max: 15, step: 1, target: 5, tolerance: 2, init: 5 },
];

const WET_PARAMS: Param[] = [
  { key: 'wetImpeller', label: 'Impeller speed', unit: 'rpm', min: 50, max: 300, step: 5, target: 200, tolerance: 40, init: 200 },
  { key: 'wetTime', label: 'Wet massing time', unit: 'min', min: 1, max: 12, step: 1, target: 4, tolerance: 2, init: 4 },
  { key: 'binderRate', label: 'Binder addition rate', unit: 'g/min', min: 100, max: 1500, step: 50, target: 500, tolerance: 200, init: 500 },
];

const SIEVE_FRACTIONS = [
  { mesh: '# 20 (retained)', pct: 8, correct: 'Pass' },
  { mesh: '# 40 (retained)', pct: 62, correct: 'Pass' },
  { mesh: '# 60 (through)', pct: 30, correct: 'Pass' },
];

export function Stage2Granulation({ faults, onComplete }: StageProps) {
  const [checks, setChecks] = React.useState<boolean[]>(() => PRE_CHECKS.map(() => false));
  const [params, setParams] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    [...DRY_PARAMS, ...WET_PARAMS].forEach((p) => (init[p.key] = p.init));
    return init;
  });
  const [pvp, setPvp] = React.useState(20);
  const [water, setWater] = React.useState(200);
  const [lod] = React.useState(() => round(1.2 + Math.random() * 4.3, 1));
  const [lodDecision, setLodDecision] = React.useState('');
  const [sieveVerdicts, setSieveVerdicts] = React.useState<string[]>(() => SIEVE_FRACTIONS.map(() => ''));
  const { current, responses, done, resolve, start, remaining } = useFaultQueue(faults);

  const allParams = [...DRY_PARAMS, ...WET_PARAMS];
  const paramsInSpec = allParams.filter((p) => Math.abs(params[p.key] - p.target) <= p.tolerance).length;
  const binderPct = water > 0 ? round((pvp / water) * 100, 1) : 0;

  const lodHigh = lod > 3.0;
  const correctLodDecision = lodHigh ? 'consult' : 'proceed';
  const lodDecided = lodDecision !== '';
  const lodCorrect = lodDecision === correctLodDecision;

  const sieveCorrect = sieveVerdicts.filter((v, i) => v === SIEVE_FRACTIONS[i].correct).length;
  const sieveDone = sieveVerdicts.every((v) => v !== '');

  const checklistScore = (checks.filter(Boolean).length / PRE_CHECKS.length) * 3;
  const paramScore = (paramsInSpec / allParams.length) * 4;
  const lodScore = lodDecided && lodCorrect ? 4 : 0;
  const sieveScore = (sieveCorrect / SIEVE_FRACTIONS.length) * 4;
  const score = Math.max(0, Math.min(MAX_POINTS, checklistScore + paramScore + lodScore + sieveScore));

  const faultsPending = remaining > 0;
  const canComplete = done && checks.every(Boolean) && lodDecided && sieveDone;

  function complete() {
    const deviations: DeviationLogEntry[] = [];
    responses.forEach((r, i) => {
      const f = faults.find((ff) => ff.id === r.faultId);
      if (f && r.deviationDocumented && r.rootCause) {
        deviations.push({
          id: `DEV-GRAN-${i + 1}`,
          stage: 'granulation',
          deviation: f.title,
          rootCause: r.rootCause,
          action: r.actionTaken ?? '—',
          impact: severityToImpact(f.severity),
          severity: f.severity,
        });
      }
    });
    if (lodHigh) {
      deviations.push({
        id: 'DEV-GRAN-LOD',
        stage: 'granulation',
        deviation: `LOD after drying ${lod}% exceeds 3.0% limit`,
        rootCause: 'Process parameter drift',
        action: lodCorrect ? 'Consulted QA and documented decision' : 'Decision recorded',
        impact: severityToImpact('MEDIUM'),
        severity: 'MEDIUM',
      });
    }
    onComplete(
      makeStageResult(
        'granulation',
        MAX_POINTS,
        score,
        {
          checks,
          params,
          binder: { pvp, water, pctWV: binderPct },
          lod,
          lodDecision,
          sieve: SIEVE_FRACTIONS.map((s, i) => ({ ...s, verdict: sieveVerdicts[i] })),
        },
        deviations
      ),
      responses
    );
  }

  return (
    <div className="space-y-4">
      {current && <FaultAlert fault={current} onResolved={resolve} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-pharma-blue" /> High-Shear Granulation (RMG)
          </CardTitle>
          <CardDescription>Charge, dry-mix, add binder, wet-mass, dry and characterise granules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="relative h-28 w-28 rounded-full border-4 border-slate-300 bg-slate-100">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="h-1.5 w-20 rounded bg-pharma-blue" />
                <div className="absolute h-20 w-1.5 rounded bg-pharma-blue" />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-slate-700" />
              </div>
            </div>
          </div>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Pre-granulation checklist</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRE_CHECKS.map((c, i) => (
                <ChecklistItem
                  key={c}
                  id={`gran-check-${i}`}
                  label={c}
                  checked={checks[i]}
                  onCheckedChange={(v) => {
                    const next = [...checks];
                    next[i] = v;
                    setChecks(next);
                  }}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Dry mixing parameters</h4>
            {DRY_PARAMS.map((p) => (
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

          <section className="space-y-2 rounded-lg border p-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Beaker className="h-4 w-4 text-pharma-teal" /> Binder solution preparation
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium">PVP K30 (kg)</label>
                <Input type="number" value={pvp} onChange={(e) => setPvp(Number(e.target.value))} className="h-9 tabular-nums" />
              </div>
              <div>
                <label className="text-xs font-medium">Purified water (L)</label>
                <Input type="number" value={water} onChange={(e) => setWater(Number(e.target.value))} className="h-9 tabular-nums" />
              </div>
              <div className="flex flex-col justify-end">
                <span className="text-xs text-muted-foreground">Concentration</span>
                <span
                  className={cn(
                    'font-mono text-lg font-semibold tabular-nums',
                    Math.abs(binderPct - 10) <= 2 ? 'text-pharma-success' : 'text-pharma-warning'
                  )}
                >
                  {binderPct}% w/v
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Wet granulation parameters</h4>
            {WET_PARAMS.map((p) => (
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

          <section className="space-y-2 rounded-lg border p-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <FlaskConical className="h-4 w-4 text-pharma-purple" /> Loss on Drying (LOD)
            </h4>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'font-mono text-2xl font-bold tabular-nums',
                  lodHigh ? 'text-pharma-danger' : 'text-pharma-success'
                )}
              >
                {lod}%
              </span>
              <Badge variant={lodHigh ? 'destructive' : 'success'}>
                {lodHigh ? 'Above 3.0% limit' : 'Within limit (≤3.0%)'}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Decision</label>
              <Select value={lodDecision} onValueChange={setLodDecision}>
                <SelectTrigger>
                  <SelectValue placeholder="Interpret result and decide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proceed">Release granules to compression</SelectItem>
                  <SelectItem value="dry">Continue drying and re-test</SelectItem>
                  <SelectItem value="consult">Consult QA and document (OOS)</SelectItem>
                </SelectContent>
              </Select>
              {lodDecided && (
                <p className={cn('text-xs', lodCorrect ? 'text-pharma-success' : 'text-pharma-danger')}>
                  {lodCorrect
                    ? 'Correct decision for this LOD result.'
                    : lodHigh
                      ? 'An OOS LOD requires QA consultation before release.'
                      : 'Granules within LOD limit can be released to compression.'}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Sieve analysis (particle size distribution)</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {SIEVE_FRACTIONS.map((f, i) => (
                <div key={f.mesh} className="space-y-1.5 rounded-lg border p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{f.mesh}</span>
                    <span className="tabular-nums text-muted-foreground">{f.pct}%</span>
                  </div>
                  <Select
                    value={sieveVerdicts[i]}
                    onValueChange={(v) => {
                      const next = [...sieveVerdicts];
                      next[i] = v;
                      setSieveVerdicts(next);
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Verdict" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pass">Pass</SelectItem>
                      <SelectItem value="Fail">Fail</SelectItem>
                      <SelectItem value="Investigate">Investigate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>

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
        stageTitle="Granulation"
        score={score}
        maxPoints={MAX_POINTS}
        disabled={!canComplete}
        disabledReason={!canComplete ? 'Complete checklist, LOD decision, sieve verdicts and alerts' : undefined}
        onComplete={complete}
      />
    </div>
  );
}
