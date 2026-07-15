'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ReadinessScore as ReadinessScoreData } from '@/lib/types';

export function scoreTone(score: number): {
  label: string;
  text: string;
  indicator: string;
} {
  if (score >= 85) return { label: 'Good', text: 'text-pharma-success', indicator: 'bg-pharma-success' };
  if (score >= 65) return { label: 'Fair', text: 'text-pharma-warning', indicator: 'bg-pharma-warning' };
  return { label: 'At Risk', text: 'text-pharma-danger', indicator: 'bg-pharma-danger' };
}

interface ReadinessScoreProps {
  readiness: ReadinessScoreData;
}

export function ReadinessScore({ readiness }: ReadinessScoreProps) {
  const overallTone = scoreTone(readiness.overall);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Readiness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className={cn('text-5xl font-bold leading-none', overallTone.text)}>
              {readiness.overall}
              <span className="text-2xl">%</span>
            </div>
            <p className={cn('mt-1 text-sm font-medium', overallTone.text)}>{overallTone.label}</p>
          </div>
          <div className="flex-1">
            <Progress
              value={readiness.overall}
              indicatorClassName={overallTone.indicator}
              className="h-4"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Overall audit readiness across all compliance categories.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {readiness.categories.map((cat) => {
            const tone = scoreTone(cat.score);
            return (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cat.name}</span>
                  <span className={cn('font-semibold', tone.text)}>{cat.score}%</span>
                </div>
                <Progress value={cat.score} indicatorClassName={tone.indicator} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
