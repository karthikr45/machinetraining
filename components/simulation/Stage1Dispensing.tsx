'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Scale, Thermometer, Droplets, AlertTriangle } from 'lucide-react';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { cn, round } from '@/lib/utils';
import { evaluateMaterial } from '@/lib/simulation-engine';
import type { MaterialEntry, DeviationLogEntry } from '@/lib/types';
import { severityToImpact } from '@/lib/simulation-shared';
import { StageFooter, useFaultQueue } from './controls';
import { FaultAlert } from './FaultAlert';
import { makeStageResult, type StageProps } from './shared';

const TEMP_RANGE = { min: 20, max: 25 };
const RH_RANGE = { min: 45, max: 65 };
const MAX_POINTS = 15;

const statusBadge: Record<MaterialEntry['status'], { variant: 'success' | 'warning' | 'destructive'; label: string }> = {
  ok: { variant: 'success', label: 'OK' },
  warn: { variant: 'warning', label: 'WARN' },
  fail: { variant: 'destructive', label: 'FAIL' },
};

export function Stage1Dispensing({ config, faults, onComplete }: StageProps) {
  const [entered, setEntered] = React.useState<number[]>(() =>
    config.dispensingFormula.map((m) => m.target)
  );
  const [temperature, setTemperature] = React.useState(22);
  const [rh, setRh] = React.useState(55);
  const { current, responses, done, resolve, start, remaining } = useFaultQueue(faults);

  const materials: MaterialEntry[] = config.dispensingFormula.map((m, i) => {
    const val = entered[i] ?? 0;
    const evalRes = evaluateMaterial(m.target, m.tolerancePct, val);
    return {
      material: m.material,
      target: m.target,
      tolerancePct: m.tolerancePct,
      entered: val,
      variancePct: evalRes.variancePct,
      status: evalRes.status,
    };
  });

  const materialPoints = config.dispensingFormula.reduce((sum, m, i) => {
    return sum + evaluateMaterial(m.target, m.tolerancePct, entered[i] ?? 0).points;
  }, 0);

  const tempOk = temperature >= TEMP_RANGE.min && temperature <= TEMP_RANGE.max;
  const rhOk = rh >= RH_RANGE.min && rh <= RH_RANGE.max;
  const envOk = tempOk && rhOk;

  const score = Math.max(0, Math.min(MAX_POINTS, materialPoints + (envOk ? 1 : -2)));

  const totalTarget = round(config.dispensingFormula.reduce((s, m) => s + m.target, 0), 2);
  const totalEntered = round(entered.reduce((s, v) => s + (v || 0), 0), 2);

  const faultsPending = remaining > 0;

  function complete() {
    const deviations: DeviationLogEntry[] = [];
    responses.forEach((r, i) => {
      const f = faults.find((ff) => ff.id === r.faultId);
      if (f && r.deviationDocumented && r.rootCause) {
        deviations.push({
          id: `DEV-DISP-${i + 1}`,
          stage: 'dispensing',
          deviation: f.title,
          rootCause: r.rootCause,
          action: r.actionTaken ?? '—',
          impact: severityToImpact(f.severity),
          severity: f.severity,
        });
      }
    });
    materials.forEach((m) => {
      if (m.status === 'fail') {
        deviations.push({
          id: `DEV-DISP-W-${m.material}`,
          stage: 'dispensing',
          deviation: `${m.material} dispensed out of tolerance (${m.variancePct}%)`,
          rootCause: 'Operator / procedural error',
          action: 'Re-dispensed to target and verified',
          impact: severityToImpact('MEDIUM'),
          severity: 'MEDIUM',
        });
      }
    });
    onComplete(
      makeStageResult(
        'dispensing',
        MAX_POINTS,
        score,
        { materials, temperature, rh, totalEntered, totalTarget },
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
            <Scale className="h-5 w-5 text-pharma-blue" /> Raw Material Dispensing
          </CardTitle>
          <CardDescription>
            Dispense each material to target within tolerance. Batch: {config.productName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div
            key={totalEntered}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            className="mx-auto flex max-w-sm items-center justify-between rounded-xl border-2 border-slate-800 bg-slate-900 px-5 py-3 text-white shadow-inner"
          >
            <span className="text-xs uppercase tracking-widest text-slate-400">Balance</span>
            <span className="font-mono text-3xl font-bold tabular-nums text-emerald-400">
              {totalEntered.toFixed(2)}
              <span className="ml-1 text-base text-slate-400">kg</span>
            </span>
          </motion.div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Target (kg)</TableHead>
                  <TableHead className="text-right">Dispensed (kg)</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m, i) => (
                  <TableRow key={m.material}>
                    <TableCell className="font-medium">{m.material}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.target.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={entered[i]}
                        onChange={(e) => {
                          const next = [...entered];
                          next[i] = Number(e.target.value);
                          setEntered(next);
                        }}
                        className="ml-auto h-9 w-24 text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        m.status === 'ok' ? 'text-pharma-success' : 'text-pharma-danger'
                      )}
                    >
                      {m.variancePct > 0 ? '+' : ''}
                      {m.variancePct}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusBadge[m.status].variant}>{statusBadge[m.status].label}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm">
            <span className="font-medium">Batch weight reconciliation</span>
            <span className="tabular-nums">
              {totalEntered.toFixed(2)} / {totalTarget.toFixed(2)} kg{' '}
              <span
                className={cn(
                  'font-semibold',
                  Math.abs(totalEntered - totalTarget) <= totalTarget * 0.02
                    ? 'text-pharma-success'
                    : 'text-pharma-danger'
                )}
              >
                ({totalEntered >= totalTarget ? '+' : ''}
                {round(totalEntered - totalTarget, 2)} kg)
              </span>
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Thermometer className="h-4 w-4 text-pharma-teal" /> Area Temperature
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="h-9 w-24 tabular-nums"
                />
                <span className="text-sm text-muted-foreground">°C</span>
                {!tempOk && (
                  <span className="flex items-center gap-1 text-xs text-pharma-warning">
                    <AlertTriangle className="h-3.5 w-3.5" /> Limit {TEMP_RANGE.min}–{TEMP_RANGE.max}°C
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Droplets className="h-4 w-4 text-pharma-teal" /> Relative Humidity
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={rh}
                  onChange={(e) => setRh(Number(e.target.value))}
                  className="h-9 w-24 tabular-nums"
                />
                <span className="text-sm text-muted-foreground">%RH</span>
                {!rhOk && (
                  <span className="flex items-center gap-1 text-xs text-pharma-warning">
                    <AlertTriangle className="h-3.5 w-3.5" /> Limit {RH_RANGE.min}–{RH_RANGE.max}%
                  </span>
                )}
              </div>
            </div>
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
                <AlertTriangle
                  className={cn('h-4 w-4', faultsPending ? 'text-pharma-danger' : 'text-pharma-success')}
                />
                {faultsPending
                  ? `${remaining} process alert${remaining > 1 ? 's' : ''} require a response`
                  : 'All process alerts handled'}
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
        stageTitle="Dispensing"
        score={score}
        maxPoints={MAX_POINTS}
        disabled={!done}
        disabledReason={!done ? 'Respond to all process alerts to continue' : undefined}
        onComplete={complete}
      />
    </div>
  );
}
