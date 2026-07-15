'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, RotateCcw, AlertTriangle, LifeBuoy, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Certificate } from './Certificate';
import type { QuizQuestionData } from './QuizQuestion';

export interface QuizResultItem {
  questionId: string;
  selected: number;
  correctIndex: number;
  correct: boolean;
  explanation: string;
}

export interface QuizResultsProps {
  score: number;
  passed: boolean;
  passingScore: number;
  attempts: number;
  maxAttempts: number;
  blocked: boolean;
  capaCreated: boolean;
  expiresAt?: Date | string | null;
  results: QuizResultItem[];
  questions: QuizQuestionData[];
  locale: string;
  onRetry: () => void;
  certificate: {
    recipientName: string;
    employeeId?: string | null;
    moduleTitle: string;
    machineName: string;
    companyName?: string;
    framework?: string;
    certificateId: string;
  };
}

export function QuizResults({
  score,
  passed,
  passingScore,
  attempts,
  maxAttempts,
  blocked,
  capaCreated,
  expiresAt,
  results,
  questions,
  locale,
  onRetry,
  certificate,
}: QuizResultsProps) {
  const [certOpen, setCertOpen] = useState(false);
  const attemptsLeft = Math.max(maxAttempts - attempts, 0);
  const isHi = locale === 'hi';

  const byId = new Map(questions.map((q) => [q.id, q]));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-6 text-center ${
          passed ? 'border-pharma-success/40 bg-pharma-success/5' : 'border-destructive/40 bg-destructive/5'
        }`}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          {passed ? (
            <Award className="h-8 w-8 text-pharma-success" />
          ) : (
            <XCircle className="h-8 w-8 text-destructive" />
          )}
        </div>
        <h2 className="mt-3 text-2xl font-bold">
          {passed ? 'Passed' : 'Not passed'}
        </h2>
        <div className="mt-1 text-4xl font-extrabold tabular-nums">
          <span className={passed ? 'text-pharma-success' : 'text-destructive'}>{score}%</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Passing score {passingScore}% · Attempt {attempts} of {maxAttempts}
        </p>

        {passed ? (
          <div className="mt-4">
            <Dialog open={certOpen} onOpenChange={setCertOpen}>
              <DialogTrigger asChild>
                <Button variant="success">
                  <Award className="h-4 w-4" />
                  View certificate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Certificate of Competency</DialogTitle>
                </DialogHeader>
                <Certificate
                  recipientName={certificate.recipientName}
                  employeeId={certificate.employeeId}
                  title={certificate.moduleTitle}
                  machineName={certificate.machineName}
                  score={score}
                  issuedAt={new Date()}
                  expiresAt={expiresAt ?? null}
                  certificateId={certificate.certificateId}
                  companyName={certificate.companyName}
                  framework={certificate.framework}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </motion.div>

      {blocked ? (
        <div className="rounded-xl border border-pharma-purple/40 bg-pharma-purple/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-pharma-purple" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-pharma-purple">
                Maximum attempts reached
                {capaCreated ? <Badge variant="purple">CAPA raised</Badge> : null}
              </div>
              <p className="text-sm text-slate-700">
                You have used all {maxAttempts} attempts. A corrective action (CAPA) has been
                logged and your supervisor has been notified for a competency review. Please
                contact your supervisor before re-attempting.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!passed && !blocked ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={onRetry}>
            <RotateCcw className="h-4 w-4" />
            Retry ({attemptsLeft} left)
          </Button>
        </div>
      ) : null}

      {blocked ? (
        <div className="flex justify-center">
          <Button variant="outline" disabled>
            <LifeBuoy className="h-4 w-4" />
            Contact your supervisor to continue
          </Button>
        </div>
      ) : null}

      {/* Per-question review */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Review</h3>
        {results.map((r, idx) => {
          const q = byId.get(r.questionId);
          if (!q) return null;
          const questionText = isHi && q.questionHi ? q.questionHi : q.question;
          const options = isHi && q.optionsHi?.length ? q.optionsHi : q.options;
          return (
            <div key={r.questionId} className="rounded-lg border p-4">
              <div className="flex items-start gap-2">
                {r.correct ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pharma-success" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                )}
                <p className="text-sm font-medium text-slate-900">
                  {idx + 1}. {questionText}
                </p>
              </div>
              <div className="mt-2 space-y-1 pl-7 text-sm">
                {r.selected >= 0 ? (
                  <p className={r.correct ? 'text-pharma-success' : 'text-destructive'}>
                    Your answer: {options[r.selected] ?? '—'}
                  </p>
                ) : (
                  <p className="text-destructive">Not answered</p>
                )}
                {!r.correct ? (
                  <p className="text-pharma-success">
                    Correct answer: {options[r.correctIndex] ?? '—'}
                  </p>
                ) : null}
                {r.explanation ? (
                  <p className="text-muted-foreground">{r.explanation}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
