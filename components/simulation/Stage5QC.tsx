'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microscope, AlertTriangle, FlaskConical, ShieldCheck } from 'lucide-react';
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
import { severityToImpact } from '@/lib/simulation-shared';
import { ChecklistItem, StageFooter, useFaultQueue } from './controls';
import { FaultAlert } from './FaultAlert';
import { makeStageResult, type StageProps } from './shared';

const MAX_POINTS = 15;
const AQL_N = 200;

interface QCTest {
  key: string;
  name: string;
  spec: string;
  result: string;
  expected: 'Pass' | 'Investigate';
}

function buildTests(oosIndex: number | null): QCTest[] {
  const base: QCTest[] = [
    { key: 'desc', name: 'Description', spec: 'White, round, film-coated', result: 'White, round, film-coated', expected: 'Pass' },
    { key: 'weight', name: 'Average Weight (RSD)', spec: '500 mg ± 5%, RSD ≤ 2%', result: 'Mean 500.4 mg, RSD 1.1%', expected: 'Pass' },
    { key: 'hardness', name: 'Hardness', spec: '5–8 kP', result: '6.4 kP', expected: 'Pass' },
    { key: 'friability', name: 'Friability', spec: 'NMT 1.0%', result: '0.42%', expected: 'Pass' },
    { key: 'disint', name: 'Disintegration', spec: 'NMT 15 min', result: '7.8 min', expected: 'Pass' },
    { key: 'dissolution', name: 'Dissolution', spec: 'Q = 80% at 30 min', result: 'Mean 91% (all ≥ 85%)', expected: 'Pass' },
    { key: 'assay', name: 'Assay', spec: '95.0–105.0%', result: '99.3%', expected: 'Pass' },
  ];
  if (oosIndex !== null) {
    const oos: Record<number, { result: string }> = {
      0: { result: 'Slight colour mottling on 3 units' },
      1: { result: 'Mean 500.2 mg, RSD 2.6%' },
      2: { result: '4.1 kP' },
      3: { result: '1.3%' },
      4: { result: '16.2 min (1 unit)' },
      5: { result: 'Mean 74% (2 units < Q)' },
      6: { result: '92.1%' },
    };
    base[oosIndex] = { ...base[oosIndex], result: oos[oosIndex].result, expected: 'Investigate' };
  }
  return base;
}

const INVESTIGATION_OPTIONS = [
  'Phase 1 lab investigation: review raw data & calculations, check instrument/standard, hypothesis test per OOS SOP',
  'Average the OOS unit with passing units to meet spec',
  'Discard the result and release the batch',
  'Reject the batch immediately without investigation',
];
const CORRECT_INVESTIGATION = 0;

export function Stage5QC({ faults, onComplete }: StageProps) {
  const [aqlConfirmed, setAqlConfirmed] = React.useState(false);
  const [oosIndex] = React.useState<number | null>(() => (Math.random() < 0.3 ? Math.floor(Math.random() * 7) : null));
  const tests = React.useMemo(() => buildTests(oosIndex), [oosIndex]);
  const [verdicts, setVerdicts] = React.useState<string[]>(() => tests.map(() => ''));
  const [investigation, setInvestigation] = React.useState<number | null>(null);
  const [release, setRelease] = React.useState('');
  const { current, responses, done, resolve, start, remaining } = useFaultQueue(faults);

  const hasOOS = oosIndex !== null;
  const verdictsDone = verdicts.every((v) => v !== '');
  const verdictCorrect = verdicts.filter((v, i) => v === tests[i].expected).length;
  const investigationDone = !hasOOS || investigation !== null;
  const investigationCorrect = !hasOOS || investigation === CORRECT_INVESTIGATION;
  const correctRelease = hasOOS ? 'hold' : 'release';
  const releaseCorrect = release === correctRelease;

  const aqlScore = aqlConfirmed ? 2 : 0;
  const verdictScore = (verdictCorrect / tests.length) * 5;
  const investigationScore = hasOOS ? (investigationCorrect ? 4 : 0) : 4;
  const releaseScore = release ? (releaseCorrect ? 4 : 0) : 0;
  const score = Math.max(0, Math.min(MAX_POINTS, aqlScore + verdictScore + investigationScore + releaseScore));

  const faultsPending = remaining > 0;
  const canComplete = aqlConfirmed && verdictsDone && investigationDone && release !== '' && done;

  function complete() {
    const deviations: DeviationLogEntry[] = [];
    responses.forEach((r, i) => {
      const f = faults.find((ff) => ff.id === r.faultId);
      if (f && r.deviationDocumented && r.rootCause) {
        deviations.push({
          id: `DEV-QC-${i + 1}`,
          stage: 'qc',
          deviation: f.title,
          rootCause: r.rootCause,
          action: r.actionTaken ?? '—',
          impact: severityToImpact(f.severity),
          severity: f.severity,
        });
      }
    });
    if (hasOOS) {
      deviations.push({
        id: 'DEV-QC-OOS',
        stage: 'qc',
        deviation: `Out-of-specification result: ${tests[oosIndex].name} (${tests[oosIndex].result})`,
        rootCause: 'Material / component out of specification',
        action: investigationCorrect ? 'Initiated Phase 1 OOS investigation' : 'Recorded result',
        impact: severityToImpact('HIGH'),
        severity: 'HIGH',
      });
    }
    onComplete(
      makeStageResult(
        'qc',
        MAX_POINTS,
        score,
        {
          aqlSampleSize: AQL_N,
          tests: tests.map((t, i) => ({ name: t.name, result: t.result, verdict: verdicts[i], expected: t.expected })),
          oos: hasOOS ? tests[oosIndex].name : null,
          investigation: hasOOS ? INVESTIGATION_OPTIONS[investigation ?? -1] ?? null : null,
          releaseDecision: release,
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
            <Microscope className="h-5 w-5 text-pharma-blue" /> Quality Control &amp; Release
          </CardTitle>
          <CardDescription>Confirm sampling, evaluate finished-product tests, and decide disposition.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2 rounded-lg border p-3">
            <h4 className="text-sm font-semibold">AQL sampling</h4>
            <p className="text-sm text-muted-foreground">
              Batch of 400,000 tablets — IS 2500 / AQL Level II requires a sample size of{' '}
              <span className="font-semibold text-foreground">n = {AQL_N}</span>.
            </p>
            <ChecklistItem
              id="aql-confirm"
              label={`Confirm ${AQL_N} tablets drawn per the AQL plan`}
              checked={aqlConfirmed}
              onCheckedChange={setAqlConfirmed}
            />
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Finished product testing (7 tests)</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Specification</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="w-36">Verdict</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((t, i) => {
                    const isOOS = i === oosIndex;
                    return (
                      <TableRow key={t.key} className={cn(isOOS && 'bg-pharma-danger/5')}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.spec}</TableCell>
                        <TableCell className={cn('text-sm', isOOS && 'font-semibold text-pharma-danger')}>
                          {t.result}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={verdicts[i]}
                            onValueChange={(v) => {
                              const next = [...verdicts];
                              next[i] = v;
                              setVerdicts(next);
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pass">Pass</SelectItem>
                              <SelectItem value="Fail">Fail</SelectItem>
                              <SelectItem value="Investigate">Investigate</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          <AnimatePresence>
            {hasOOS && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 overflow-hidden rounded-lg border border-pharma-danger/40 bg-pharma-danger/5 p-3"
              >
                <h4 className="flex items-center gap-2 text-sm font-semibold text-pharma-danger">
                  <FlaskConical className="h-4 w-4" /> OOS Investigation — {tests[oosIndex].name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  An out-of-specification result was obtained. Select the correct first step.
                </p>
                <div className="space-y-2">
                  {INVESTIGATION_OPTIONS.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInvestigation(i)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-lg border bg-card p-2.5 text-left text-sm min-h-[44px]',
                        investigation === i ? 'border-pharma-blue ring-1 ring-pharma-blue' : 'hover:bg-accent'
                      )}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <section className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-pharma-teal" /> Batch disposition
            </h4>
            <Select value={release} onValueChange={setRelease}>
              <SelectTrigger>
                <SelectValue placeholder="Final release decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="release">Release to market</SelectItem>
                <SelectItem value="hold">Hold pending investigation</SelectItem>
                <SelectItem value="reject">Reject batch</SelectItem>
              </SelectContent>
            </Select>
            {release && (
              <p className={cn('text-xs', releaseCorrect ? 'text-pharma-success' : 'text-pharma-danger')}>
                {releaseCorrect
                  ? 'Correct disposition for these results.'
                  : hasOOS
                    ? 'An unresolved OOS means the batch cannot be released — hold pending investigation.'
                    : 'All tests pass — the batch can be released.'}
              </p>
            )}
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
        stageTitle="Quality Control"
        score={score}
        maxPoints={MAX_POINTS}
        disabled={!canComplete}
        disabledReason={!canComplete ? 'Confirm sampling, verdicts, investigation and disposition' : undefined}
        onComplete={complete}
      />
    </div>
  );
}
