'use client';

import { Printer, ShieldCheck, ShieldAlert, ShieldX, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatDateTime } from '@/lib/utils';
import type { InspectionResult, InspectionQuestionResult } from '@/lib/types';
import { ReadinessScore } from './ReadinessScore';

const GRADE_META: Record<
  InspectionResult['grade'],
  { label: string; text: string; border: string; Icon: typeof ShieldCheck }
> = {
  READY: {
    label: 'Inspection Ready',
    text: 'text-pharma-success',
    border: 'border-pharma-success/40 bg-pharma-success/5',
    Icon: ShieldCheck,
  },
  NEEDS_IMPROVEMENT: {
    label: 'Needs Improvement',
    text: 'text-pharma-warning',
    border: 'border-pharma-warning/40 bg-pharma-warning/5',
    Icon: ShieldAlert,
  },
  NOT_READY: {
    label: 'Not Ready',
    text: 'text-pharma-danger',
    border: 'border-pharma-danger/40 bg-pharma-danger/5',
    Icon: ShieldX,
  },
};

const FINDING_ORDER: {
  level: InspectionQuestionResult['findingLevel'];
  label: string;
  variant: 'destructive' | 'purple' | 'warning' | 'gray';
}[] = [
  { level: 'CRITICAL', label: 'Critical', variant: 'destructive' },
  { level: 'MAJOR', label: 'Major', variant: 'purple' },
  { level: 'MINOR', label: 'Minor', variant: 'warning' },
  { level: 'OBSERVATION', label: 'Observation', variant: 'gray' },
];

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #inspection-report, #inspection-report * { visibility: visible !important; }
  #inspection-report { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
  .no-print { display: none !important; }
}`;

interface InspectionReportProps {
  result: InspectionResult;
  onRestart?: () => void;
}

export function InspectionReport({ result, onRestart }: InspectionReportProps) {
  const meta = GRADE_META[result.grade];
  const GradeIcon = meta.Icon;
  const findings = result.questions.filter((q) => q.findingLevel !== 'NONE');

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Inspection Report</h2>
        <div className="flex items-center gap-2">
          {onRestart && (
            <Button variant="outline" onClick={onRestart}>
              Run Again
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div id="inspection-report" className="space-y-6">
        <Card className={cn('border-2', meta.border)}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-4">
              <GradeIcon className={cn('h-12 w-12', meta.text)} />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Overall Grade
                </p>
                <p className={cn('text-2xl font-bold', meta.text)}>{meta.label}</p>
                <p className="text-xs text-muted-foreground">
                  Generated {formatDateTime(new Date())}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Readiness</p>
              <p className={cn('text-4xl font-bold', meta.text)}>{result.readiness.overall}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{result.summary}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Findings ({findings.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {findings.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-pharma-success">
                <CheckCircle2 className="h-5 w-5" />
                No findings — all inspection areas are complete.
              </div>
            ) : (
              FINDING_ORDER.map((group) => {
                const items = findings.filter((f) => f.findingLevel === group.level);
                if (items.length === 0) return null;
                return (
                  <div key={group.level} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={group.variant}>{group.label}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {items.length} finding{items.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {items.map((f) => (
                      <div key={f.id} className="rounded-lg border p-3">
                        <p className="text-sm font-medium">{f.category}</p>
                        {f.finding && <p className="mt-1 text-sm">{f.finding}</p>}
                        {f.recommendation && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-semibold">Recommendation:</span>{' '}
                            {f.recommendation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <ReadinessScore readiness={result.readiness} />
      </div>
    </div>
  );
}
