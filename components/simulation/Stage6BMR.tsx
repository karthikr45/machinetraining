'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { FileCheck2, ShieldCheck, Lock, AlertTriangle, PenLine } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { cn, formatIndianNumber, formatDate, round } from '@/lib/utils';
import type { BMRDocument, FaultResponse, StageResult, DeviationLogEntry } from '@/lib/types';
import { severityToImpact } from '@/lib/simulation-shared';
import { ChecklistItem, useFaultQueue } from './controls';
import { FaultAlert } from './FaultAlert';
import { makeStageResult } from './shared';
import type { SimConfigDTO } from '@/lib/simulation-shared';
import type { Fault } from '@/lib/types';

const MAX_POINTS = 15;

const SECTIONS = [
  { key: 's1', label: 'Section 1 — Product & batch details verified' },
  { key: 's2', label: 'Section 2 — Dispensing record verified' },
  { key: 's3', label: 'Section 3 — Granulation record verified' },
  { key: 's4', label: 'Section 4 — Compression record verified' },
  { key: 's5', label: 'Section 5 — Coating record verified' },
  { key: 's6', label: 'Section 6 — QC & release record verified' },
  { key: 's7', label: 'Section 7 — Yield reconciliation verified' },
];

interface BMRStageProps {
  config: SimConfigDTO;
  batchNumber: string;
  bmr: BMRDocument;
  faults: Fault[];
  operatorName: string;
  operatorDesignation: string;
  submitting: boolean;
  onSign: (result: StageResult, faultResponses: FaultResponse[], password: string) => void;
}

export function Stage6BMR({
  batchNumber,
  bmr,
  faults,
  operatorName,
  operatorDesignation,
  submitting,
  onSign,
}: BMRStageProps) {
  const [verified, setVerified] = React.useState<Record<string, boolean>>({});
  const [confirmedDeviations, setConfirmedDeviations] = React.useState<boolean[]>(() =>
    bmr.deviations.map(() => false)
  );
  const [legal, setLegal] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const { current, responses, done, resolve, start, remaining } = useFaultQueue(faults);

  const sectionsVerified = SECTIONS.filter((s) => verified[s.key]).length;
  const allSections = sectionsVerified === SECTIONS.length;
  const allDeviations = confirmedDeviations.every(Boolean);
  const faultsPending = remaining > 0;

  const canSign =
    allSections && allDeviations && legal && password.length > 0 && done && !submitting;

  const sectionScore = (sectionsVerified / SECTIONS.length) * 6;
  const deviationScore = allDeviations ? 3 : 0;
  const signatureReadyScore = legal && password.length > 0 ? 6 : 0;
  const score = Math.max(0, Math.min(MAX_POINTS, sectionScore + deviationScore + signatureReadyScore));

  function sign() {
    if (!canSign) return;
    const deviations: DeviationLogEntry[] = [];
    responses.forEach((r, i) => {
      const f = faults.find((ff) => ff.id === r.faultId);
      if (f && r.deviationDocumented && r.rootCause) {
        deviations.push({
          id: `DEV-BMR-${i + 1}`,
          stage: 'bmr',
          deviation: f.title,
          rootCause: r.rootCause,
          action: r.actionTaken ?? '—',
          impact: severityToImpact(f.severity),
          severity: f.severity,
        });
      }
    });
    const result = makeStageResult(
      'bmr',
      MAX_POINTS,
      score,
      {
        sectionsVerified,
        deviationsConfirmed: confirmedDeviations.length,
        legallyBindingAcknowledged: legal,
        signedBy: operatorName,
        designation: operatorDesignation,
      },
      deviations
    );
    onSign(result, responses, password);
  }

  return (
    <div className="space-y-4">
      {current && <FaultAlert fault={current} onResolved={resolve} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-pharma-blue" /> Batch Manufacturing Record
          </CardTitle>
          <CardDescription>
            Review the auto-compiled BMR, confirm every deviation, and apply your electronic signature.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header block */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-slate-50 p-3 text-sm sm:grid-cols-4">
            <Field label="Product" value={bmr.productName} />
            <Field label="Batch No" value={batchNumber} />
            <Field label="Batch Size" value={`${formatIndianNumber(bmr.batchSize)}`} />
            <Field label="Mfg Date" value={formatDate(bmr.manufacturingDate)} />
            <Field label="Theoretical Yield" value={formatIndianNumber(bmr.theoreticalYield)} />
            <Field label="Actual Yield" value={formatIndianNumber(bmr.actualYield)} />
            <Field
              label="% Yield"
              value={`${bmr.yieldPct}%`}
              className={bmr.yieldPct < 98 ? 'text-pharma-warning' : 'text-pharma-success'}
            />
            <Field label="Expiry" value={formatDate(bmr.expiryDate)} />
          </div>

          {/* Dispensing summary */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Dispensing record</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bmr.dispensing.map((m) => (
                    <TableRow key={m.material}>
                      <TableCell>{m.material}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.target}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.entered}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={m.status === 'ok' ? 'success' : m.status === 'warn' ? 'warning' : 'destructive'}>
                          {m.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Yield reconciliation */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Yield reconciliation</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Recon label="Input" value={bmr.reconciliation.input} />
              <Recon label="Produced" value={bmr.reconciliation.tabletsProduced} />
              <Recon label="Rejects" value={bmr.reconciliation.rejects} />
              <Recon label="Samples" value={bmr.reconciliation.samples} />
              <Recon label="Coating loss" value={bmr.reconciliation.coatingLoss} />
              <Recon label="% Yield" value={bmr.reconciliation.yieldPct} suffix="%" />
            </div>
          </section>

          {/* Deviations */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">
              Deviations log ({bmr.deviations.length}){' '}
              {bmr.deviations.length > 0 && !allDeviations && (
                <span className="text-xs font-normal text-pharma-danger">— all must be confirmed</span>
              )}
            </h4>
            {bmr.deviations.length === 0 ? (
              <p className="rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
                No deviations recorded during this batch.
              </p>
            ) : (
              <div className="space-y-2">
                {bmr.deviations.map((d, i) => (
                  <div
                    key={d.id}
                    className={cn(
                      'rounded-lg border p-3',
                      confirmedDeviations[i] ? 'border-pharma-success/40 bg-pharma-success/5' : 'border-pharma-warning/40 bg-pharma-warning/5'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{d.deviation}</span>
                      <Badge variant="outline">{d.stage}</Badge>
                    </div>
                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <span><b>Root cause:</b> {d.rootCause}</span>
                      <span><b>Action:</b> {d.action}</span>
                      <span className="sm:col-span-2"><b>Impact:</b> {d.impact}</span>
                    </div>
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={confirmedDeviations[i]}
                        onCheckedChange={(v) => {
                          const next = [...confirmedDeviations];
                          next[i] = Boolean(v);
                          setConfirmedDeviations(next);
                        }}
                      />
                      Deviation reviewed, impact assessed and confirmed
                    </label>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section verification */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Record verification</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {SECTIONS.map((s) => (
                <ChecklistItem
                  key={s.key}
                  id={s.key}
                  label={s.label}
                  checked={Boolean(verified[s.key])}
                  onCheckedChange={(v) => setVerified((prev) => ({ ...prev, [s.key]: v }))}
                />
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
                {faultsPending ? `${remaining} documentation alert pending` : 'All documentation alerts handled'}
              </span>
              {faultsPending && (
                <Button size="sm" variant="destructive" onClick={start}>
                  Handle Alert
                </Button>
              )}
            </div>
          )}

          {/* Signature */}
          <section className="space-y-3 rounded-xl border-2 border-pharma-blue/40 bg-pharma-blue/5 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-pharma-blue">
              <PenLine className="h-4 w-4" /> Section 8 — Electronic Signature (21 CFR Part 11)
            </h4>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox checked={legal} onCheckedChange={(v) => setLegal(Boolean(v))} className="mt-0.5" />
              <span>
                I certify that this Batch Manufacturing Record is <b>accurate, complete and contemporaneous</b>.
                I understand this electronic signature is the legally binding equivalent of my handwritten signature.
              </span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">Signed by</label>
                <Input value={operatorName} readOnly className="h-9 bg-muted" />
              </div>
              <div>
                <label className="text-xs font-medium">Designation</label>
                <Input value={operatorDesignation} readOnly className="h-9 bg-muted" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">Password (re-authenticate)</label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password to sign"
                  className="h-10"
                />
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> A server-side timestamp will be applied at the moment of signing (Contemporaneous).
            </p>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button size="lg" className="w-full" disabled={!canSign} onClick={sign}>
                <Lock className="h-4 w-4" />
                {submitting ? 'Signing & submitting…' : 'SIGN BMR & SUBMIT BATCH'}
              </Button>
            </motion.div>
            {!canSign && !submitting && (
              <p className="text-center text-xs text-pharma-warning">
                {!allSections
                  ? 'Verify all record sections'
                  : !allDeviations
                    ? 'Confirm every deviation'
                    : faultsPending
                      ? 'Resolve documentation alerts'
                      : !legal
                        ? 'Acknowledge the certification statement'
                        : 'Enter your password to sign'}
              </p>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={cn('font-medium', className)}>{value}</div>
    </div>
  );
}

function Recon({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border bg-card p-2 text-center">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold tabular-nums">
        {suffix === '%' ? round(value, 2) : formatIndianNumber(value)}
        {suffix}
      </div>
    </div>
  );
}
