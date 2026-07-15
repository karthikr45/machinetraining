'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { QuizQuestion, type QuizQuestionData } from './QuizQuestion';
import { QuizResults, type QuizResultItem } from './QuizResults';

interface QuizPayload {
  moduleId: string;
  title: string;
  titleHi?: string | null;
  machineName: string;
  passingScore: number;
  maxAttempts: number;
  attempts: number;
  status: string;
  blocked: boolean;
  questions: QuizQuestionData[];
}

interface SubmitPayload {
  score: number;
  passed: boolean;
  attempts: number;
  blocked: boolean;
  capaCreated: boolean;
  passingScore: number;
  maxAttempts: number;
  expiresAt: string | null;
  results: QuizResultItem[];
}

export interface QuizInterfaceProps {
  moduleId: string;
  machineName: string;
  recipientName: string;
  employeeId?: string | null;
  companyName?: string;
  framework?: string;
}

export function QuizInterface({
  moduleId,
  machineName,
  recipientName,
  employeeId,
  companyName,
  framework,
}: QuizInterfaceProps) {
  const locale = useLocale();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<QuizPayload>(`/api/quiz/${moduleId}`);
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrent(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const select = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = optionIndex;
      return next;
    });
  };

  const submit = async () => {
    if (!quiz) return;
    if (answers.some((a) => a === null)) {
      toast({
        title: 'Please answer all questions',
        description: 'Every question must be answered before submitting.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = await apiFetch<SubmitPayload>(`/api/quiz/${moduleId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answers.map((a) => a ?? -1) }),
      });
      setResult(payload);
      toast({
        title: payload.passed ? 'Quiz passed' : 'Quiz not passed',
        description: `Score ${payload.score}% (attempt ${payload.attempts} of ${payload.maxAttempts}).`,
        variant: payload.passed ? 'default' : 'destructive',
      });
    } catch (e) {
      toast({
        title: 'Submission failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !quiz) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="h-8 w-8 text-pharma-warning" />
          <p className="text-sm text-muted-foreground">{error ?? 'Quiz unavailable.'}</p>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const title = locale === 'hi' && quiz.titleHi ? quiz.titleHi : quiz.title;

  // Results view.
  if (result) {
    return (
      <QuizResults
        score={result.score}
        passed={result.passed}
        passingScore={result.passingScore}
        attempts={result.attempts}
        maxAttempts={result.maxAttempts}
        blocked={result.blocked}
        capaCreated={result.capaCreated}
        expiresAt={result.expiresAt}
        results={result.results}
        questions={quiz.questions}
        locale={locale}
        onRetry={() => void load()}
        certificate={{
          recipientName,
          employeeId,
          moduleTitle: quiz.title,
          machineName,
          companyName,
          framework,
          certificateId: `TR-${moduleId.slice(-8).toUpperCase()}`,
        }}
      />
    );
  }

  // Already blocked before attempting.
  if (quiz.blocked) {
    return (
      <Card className="border-pharma-purple/40 bg-pharma-purple/5">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="h-8 w-8 text-pharma-purple" />
          <h2 className="text-lg font-semibold text-pharma-purple">Maximum attempts reached</h2>
          <p className="max-w-md text-sm text-slate-700">
            You have used all {quiz.maxAttempts} attempts for this quiz. A corrective action has
            been logged. Please contact your supervisor for a competency review.
          </p>
        </CardContent>
      </Card>
    );
  }

  const answered = answers.filter((a) => a !== null).length;
  const q = quiz.questions[current];
  const isLast = current === quiz.questions.length - 1;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary">
            Attempt {quiz.attempts + 1} of {quiz.maxAttempts}
          </Badge>
        </div>
        <Progress value={(answered / quiz.questions.length) * 100} />
      </CardHeader>
      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <QuizQuestion
              data={q}
              index={current}
              total={quiz.questions.length}
              locale={locale}
              selected={answers[current]}
              onSelect={select}
            />
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {isLast ? (
            <Button onClick={submit} disabled={submitting} variant="success">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit quiz
            </Button>
          ) : (
            <Button
              onClick={() => setCurrent((c) => Math.min(quiz.questions.length - 1, c + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
