'use client';

import { motion } from 'framer-motion';
import { UserSearch, CheckCircle2, XCircle, FileSearch, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { InspectionQuestionResult } from '@/lib/types';

/** Q8 multiple-choice options. Index 2 is the compliant answer. */
export const Q8_OPTIONS: string[] = [
  'Just repeat the same training again',
  'Terminate the operator immediately',
  'CAPA + supervisor review + additional coaching',
  'Reassign the operator to a different machine',
];
export const Q8_CORRECT_INDEX = 2;

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function gradeBadge(grade: InspectionQuestionResult['grade']) {
  const map: Record<InspectionQuestionResult['grade'], { variant: 'success' | 'warning' | 'destructive'; label: string }> = {
    COMPLETE: { variant: 'success', label: 'Complete' },
    GAPS: { variant: 'warning', label: 'Gaps' },
    MISSING: { variant: 'destructive', label: 'Missing' },
  };
  return map[grade];
}

function findingBadge(level: InspectionQuestionResult['findingLevel']) {
  const map: Record<
    InspectionQuestionResult['findingLevel'],
    { variant: 'success' | 'warning' | 'destructive' | 'gray' | 'purple'; label: string }
  > = {
    NONE: { variant: 'success', label: 'No finding' },
    OBSERVATION: { variant: 'gray', label: 'Observation' },
    MINOR: { variant: 'warning', label: 'Minor' },
    MAJOR: { variant: 'purple', label: 'Major' },
    CRITICAL: { variant: 'destructive', label: 'Critical' },
  };
  return map[level];
}

interface InspectorQuestionProps {
  index: number;
  total: number;
  question: InspectionQuestionResult;
  revealed: boolean;
  onReveal: () => void;
  q8Selected: number | null;
  onSelectQ8: (i: number) => void;
  onNext: () => void;
  isLast: boolean;
}

export function InspectorQuestion({
  index,
  total,
  question,
  revealed,
  onReveal,
  q8Selected,
  onSelectQ8,
  onNext,
  isLast,
}: InspectorQuestionProps) {
  const isQ8 = question.id === 8;
  const gb = gradeBadge(question.grade);
  const fb = findingBadge(question.findingLevel);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pharma-blue/10 text-pharma-blue">
          <UserSearch className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-pharma-blue">
              FDA Inspector
            </span>
            <span className="text-xs text-muted-foreground">
              Question {index + 1} of {total} · {question.category}
            </span>
          </div>
          <Card className="bg-muted/40">
            <CardContent className="py-3">
              <p className="text-sm font-medium">&ldquo;{question.question}&rdquo;</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {isQ8 ? (
        <div className="space-y-3 pl-16">
          <p className="text-sm text-muted-foreground">Select the correct procedure:</p>
          <div className="grid gap-2">
            {Q8_OPTIONS.map((opt, i) => {
              const chosen = q8Selected === i;
              const showResult = q8Selected !== null;
              const correct = i === Q8_CORRECT_INDEX;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={q8Selected !== null}
                  onClick={() => onSelectQ8(i)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors',
                    !showResult && 'hover:border-pharma-blue hover:bg-pharma-blue/5',
                    showResult && correct && 'border-pharma-success bg-pharma-success/10',
                    showResult && chosen && !correct && 'border-pharma-danger bg-pharma-danger/10',
                    showResult && !correct && !chosen && 'opacity-60'
                  )}
                >
                  <span>{opt}</span>
                  {showResult && correct && (
                    <CheckCircle2 className="h-5 w-5 text-pharma-success" />
                  )}
                  {showResult && chosen && !correct && (
                    <XCircle className="h-5 w-5 text-pharma-danger" />
                  )}
                </button>
              );
            })}
          </div>
          {q8Selected !== null && (
            <p
              className={cn(
                'text-sm font-medium',
                q8Selected === Q8_CORRECT_INDEX ? 'text-pharma-success' : 'text-pharma-danger'
              )}
            >
              {q8Selected === Q8_CORRECT_INDEX
                ? 'Correct — a CAPA with supervisor review and additional coaching is the compliant response.'
                : 'Not compliant — the correct response is a CAPA with supervisor review and additional coaching.'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 pl-16">
          {!revealed ? (
            <Button variant="outline" onClick={onReveal}>
              <FileSearch className="h-4 w-4" /> Pull evidence
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Evidence pulled
                </span>
                <Badge variant={gb.variant}>{gb.label}</Badge>
                <Badge variant={fb.variant}>{fb.label}</Badge>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                {Object.entries(question.evidence).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-sm">
                    <dt className="text-muted-foreground">{humanizeKey(k)}</dt>
                    <dd className="font-medium">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              {question.finding && (
                <p className="text-sm text-pharma-danger">
                  <span className="font-semibold">Finding:</span> {question.finding}
                </p>
              )}
              {question.recommendation && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Recommendation:</span> {question.recommendation}
                </p>
              )}
            </motion.div>
          )}
        </div>
      )}

      <div className="flex justify-end pl-16">
        <Button
          onClick={onNext}
          disabled={isQ8 ? q8Selected === null : !revealed}
        >
          {isLast ? 'View Report' : 'Next Question'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
