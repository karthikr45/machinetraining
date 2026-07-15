'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  Award,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Download,
  RotateCcw,
  FileText,
  MessageSquareWarning,
  Sparkles,
} from 'lucide-react';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { cn, formatIndianNumber } from '@/lib/utils';
import { SIMULATION_STAGES, PASS_THRESHOLD_LABEL } from './results-const';
import type { StageKey } from '@/lib/types';

export interface ResultFault {
  id: string;
  stage: StageKey;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  correctAnswer: number;
  selectedOption: number;
  correct: boolean;
}

export interface SimulationResultsProps {
  id: string;
  machineId: string;
  machineName: string;
  batchNumber: string;
  totalScore: number;
  passed: boolean;
  attempts: number;
  stageScores: Record<string, number>;
  faults: ResultFault[];
  feedback: string;
  certificateUrl: string | null;
  reconciliation?: {
    input: number;
    tabletsProduced: number;
    rejects: number;
    samples: number;
    coatingLoss: number;
    yieldPct: number;
  };
}

const severityVariant: Record<ResultFault['severity'], 'gray' | 'warning' | 'destructive' | 'purple'> = {
  LOW: 'gray',
  MEDIUM: 'warning',
  HIGH: 'destructive',
  CRITICAL: 'purple',
};

export function SimulationResults(props: SimulationResultsProps) {
  const { passed, totalScore } = props;

  const radarData = SIMULATION_STAGES.map((s) => ({
    stage: s.short,
    value: Math.round(((props.stageScores[s.key] ?? 0) / s.maxPoints) * 100),
  }));

  const faultsCorrect = props.faults.filter((f) => f.correct).length;

  return (
    <div className="space-y-6">
      {/* Pass/fail hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={cn('overflow-hidden border-2', passed ? 'border-pharma-success' : 'border-pharma-danger')}>
          <div className={cn('px-6 py-5', passed ? 'bg-pharma-success/10' : 'bg-pharma-danger/10')}>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-full text-white',
                    passed ? 'bg-pharma-success' : 'bg-pharma-danger'
                  )}
                >
                  {passed ? <Award className="h-8 w-8" /> : <AlertOctagon className="h-8 w-8" />}
                </motion.div>
                <div>
                  <h2 className={cn('text-2xl font-bold', passed ? 'text-pharma-success' : 'text-pharma-danger')}>
                    {passed ? 'Certified — Batch Passed' : 'CAPA Required — Batch Failed'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {props.machineName} · Batch {props.batchNumber}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className={cn('font-mono text-5xl font-bold tabular-nums', passed ? 'text-pharma-success' : 'text-pharma-danger')}>
                  {Math.round(totalScore)}
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <p className="text-xs text-muted-foreground">{PASS_THRESHOLD_LABEL}</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Performance</CardTitle>
            <CardDescription>Score as a percentage of each stage&apos;s maximum.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke={passed ? '#16A34A' : '#DC2626'}
                    fill={passed ? '#16A34A' : '#DC2626'}
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SIMULATION_STAGES.map((s) => (
                <div key={s.key} className="rounded-lg border p-2 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">{s.short}</div>
                  <div className="font-mono text-sm font-semibold tabular-nums">
                    {Math.round((props.stageScores[s.key] ?? 0) * 10) / 10}
                    <span className="text-xs text-muted-foreground">/{s.maxPoints}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Batch statistics + AI feedback */}
        <div className="space-y-6">
          {props.reconciliation && (
            <Card>
              <CardHeader>
                <CardTitle>Batch Statistics</CardTitle>
                <CardDescription>Yield reconciliation for {props.batchNumber}.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Input" value={formatIndianNumber(props.reconciliation.input)} />
                <Stat label="Produced" value={formatIndianNumber(props.reconciliation.tabletsProduced)} />
                <Stat label="Rejects" value={formatIndianNumber(props.reconciliation.rejects)} />
                <Stat label="Samples" value={formatIndianNumber(props.reconciliation.samples)} />
                <Stat label="Coating loss" value={formatIndianNumber(props.reconciliation.coatingLoss)} />
                <Stat
                  label="% Yield"
                  value={`${props.reconciliation.yieldPct}%`}
                  className={props.reconciliation.yieldPct < 98 ? 'text-pharma-warning' : 'text-pharma-success'}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-pharma-purple" /> Assessor Feedback
              </CardTitle>
              <CardDescription>AI-generated GMP competency feedback.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {props.feedback}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fault responses */}
      <Card>
        <CardHeader>
          <CardTitle>Fault Scenario Responses</CardTitle>
          <CardDescription>
            {faultsCorrect}/{props.faults.length} handled correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.faults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fault scenarios were injected in this run.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-center">Severity</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {props.faults.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.title}</TableCell>
                      <TableCell className="capitalize">{f.stage}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={severityVariant[f.severity]}>{f.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {f.correct ? (
                          <span className="inline-flex items-center gap-1 text-pharma-success">
                            <CheckCircle2 className="h-4 w-4" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-pharma-danger">
                            <XCircle className="h-4 w-4" /> Incorrect
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {passed ? (
          <>
            {props.certificateUrl && (
              <Button asChild size="lg">
                <a href={props.certificateUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> Download Certificate
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <a href={props.certificateUrl ?? '#'} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4" /> View BMR / Certificate
              </a>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/simulation">
                <RotateCcw className="h-4 w-4" /> Try Another
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="outline" size="lg">
              <Link href={`/simulation/${props.machineId}`}>
                <MessageSquareWarning className="h-4 w-4" /> Review Mistakes
              </Link>
            </Button>
            {props.attempts < 3 ? (
              <Button asChild size="lg">
                <Link href={`/simulation/${props.machineId}`}>
                  <RotateCcw className="h-4 w-4" /> Retry ({3 - props.attempts} left)
                </Link>
              </Button>
            ) : (
              <Button asChild variant="secondary" size="lg">
                <Link href="/capa">Contact Supervisor</Link>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border p-2.5 text-center">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={cn('font-mono text-sm font-semibold tabular-nums', className)}>{value}</div>
    </div>
  );
}
