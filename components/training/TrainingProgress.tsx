import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface TrainingProgressProps {
  completed: number;
  total: number;
  label?: string;
  showSegments?: boolean;
  className?: string;
}

/**
 * Progress bar for a machine's module completion.
 * Renders an accessible bar plus an optional segmented view of each module.
 */
export function TrainingProgress({
  completed,
  total,
  label,
  showSegments = false,
  className,
}: TrainingProgressProps) {
  const safeTotal = Math.max(total, 0);
  const safeCompleted = Math.min(Math.max(completed, 0), safeTotal || 0);
  const pct = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);
  const done = safeTotal > 0 && safeCompleted >= safeTotal;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label ?? 'Modules completed'}</span>
        <span className="font-semibold tabular-nums">
          {safeCompleted}/{safeTotal} ({pct}%)
        </span>
      </div>

      {showSegments && safeTotal > 0 ? (
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: safeTotal }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                i < safeCompleted ? 'bg-pharma-success' : 'bg-secondary'
              )}
            />
          ))}
        </div>
      ) : (
        <Progress
          value={pct}
          indicatorClassName={done ? 'bg-pharma-success' : 'bg-primary'}
        />
      )}
    </div>
  );
}
