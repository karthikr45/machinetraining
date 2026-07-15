'use client';

import { useCallback, useEffect, useState } from 'react';
import { Play, Loader2, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import type { InspectionResult, ReadinessScore as ReadinessScoreData } from '@/lib/types';
import { ReadinessScore } from './ReadinessScore';
import { InspectorQuestion } from './InspectorQuestion';
import { InspectionReport } from './InspectionReport';

type Phase = 'idle' | 'running' | 'report';

export function InspectionSimulator() {
  const { toast } = useToast();

  const [readiness, setReadiness] = useState<ReadinessScoreData | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(true);
  const [readinessError, setReadinessError] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [starting, setStarting] = useState(false);
  const [result, setResult] = useState<InspectionResult | null>(null);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [q8Selected, setQ8Selected] = useState<number | null>(null);

  const loadReadiness = useCallback(async () => {
    setLoadingReadiness(true);
    setReadinessError(false);
    try {
      const res = await apiFetch<{ readiness: ReadinessScoreData }>(
        '/api/mock-inspection/readiness'
      );
      setReadiness(res.readiness);
    } catch (err) {
      setReadinessError(true);
      toast({
        variant: 'destructive',
        title: 'Could not load readiness score',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    } finally {
      setLoadingReadiness(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  const start = useCallback(async () => {
    setStarting(true);
    try {
      const res = await apiFetch<{ result: InspectionResult }>('/api/mock-inspection/start', {
        method: 'POST',
      });
      setResult(res.result);
      setReadiness(res.result.readiness);
      setIndex(0);
      setRevealed(new Set());
      setQ8Selected(null);
      setPhase('running');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not start inspection',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    } finally {
      setStarting(false);
    }
  }, [toast]);

  const restart = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setIndex(0);
    setRevealed(new Set());
    setQ8Selected(null);
    void loadReadiness();
  }, [loadReadiness]);

  const next = useCallback(() => {
    if (!result) return;
    if (index >= result.questions.length - 1) {
      setPhase('report');
    } else {
      setIndex((i) => i + 1);
    }
  }, [result, index]);

  if (phase === 'report' && result) {
    return <InspectionReport result={result} onRestart={restart} />;
  }

  if (phase === 'running' && result) {
    const q = result.questions[index];
    const total = result.questions.length;
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Mock FDA Inspection in progress</span>
            <span className="text-muted-foreground">
              {index + 1} / {total}
            </span>
          </div>
          <Progress value={((index + 1) / total) * 100} indicatorClassName="bg-pharma-blue" />
        </div>
        <Card>
          <CardContent className="py-6">
            <InspectorQuestion
              index={index}
              total={total}
              question={q}
              revealed={revealed.has(q.id)}
              onReveal={() => setRevealed((prev) => new Set(prev).add(q.id))}
              q8Selected={q8Selected}
              onSelectQ8={(i) => setQ8Selected(i)}
              onNext={next}
              isLast={index === total - 1}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // idle
  return (
    <div className="space-y-6">
      {loadingReadiness ? (
        <Skeleton className="h-72 w-full" />
      ) : readinessError || !readiness ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">Could not load the readiness score.</p>
            <Button onClick={() => void loadReadiness()}>Try again</Button>
          </CardContent>
        </Card>
      ) : (
        <ReadinessScore readiness={readiness} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-pharma-blue" /> Mock FDA Inspection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            An FDA inspector will ask 8 questions about your training and compliance records. The
            platform pulls live evidence for each question and grades your readiness. Answer the
            final procedural question to complete the simulation.
          </p>
          <Button size="lg" onClick={start} disabled={starting}>
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Start Mock Inspection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
