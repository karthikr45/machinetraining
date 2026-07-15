'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn, round } from '@/lib/utils';
import type { Fault, FaultResponse } from '@/lib/types';

/** A labelled range slider that colours by proximity to a target window. */
export function ParameterSlider({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 1,
  target,
  tolerance,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  target: number;
  tolerance: number;
}) {
  const withinSpec = Math.abs(value - target) <= tolerance;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span
          className={cn(
            'font-mono text-sm font-semibold tabular-nums',
            withinSpec ? 'text-pharma-success' : 'text-pharma-warning'
          )}
        >
          {round(value, 2)}
          {unit ? <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-pharma-blue',
          '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5'
        )}
        aria-label={label}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span className={cn(withinSpec ? 'text-pharma-success' : 'text-pharma-warning')}>
          Target {target}
          {unit} {withinSpec ? '· in spec' : '· adjust'}
        </span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

/** A checklist row backed by a Checkbox. */
export function ChecklistItem({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
        className="mt-0.5"
      />
      <span className={cn('text-sm', checked && 'text-muted-foreground line-through')}>{label}</span>
    </label>
  );
}

/** Sticky footer with a live score preview and the stage-complete action. */
export function StageFooter({
  stageTitle,
  score,
  maxPoints,
  disabled,
  disabledReason,
  onComplete,
  ctaLabel = 'Complete Stage',
}: {
  stageTitle: string;
  score: number;
  maxPoints: number;
  disabled: boolean;
  disabledReason?: string;
  onComplete: () => void;
  ctaLabel?: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t bg-card/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-b-xl">
      <div>
        <div className="text-xs text-muted-foreground">{stageTitle} score</div>
        <div className="font-mono text-lg font-bold tabular-nums text-pharma-blue">
          {round(score, 1)}
          <span className="text-sm text-muted-foreground">/{maxPoints}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {disabled && disabledReason && (
          <span className="text-xs text-pharma-warning">{disabledReason}</span>
        )}
        <Button size="lg" disabled={disabled} onClick={onComplete}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}

/** Manage sequential presentation + collection of a stage's injected faults. */
export function useFaultQueue(faults: Fault[]) {
  const [responses, setResponses] = React.useState<FaultResponse[]>([]);
  const [index, setIndex] = React.useState(0);
  const [active, setActive] = React.useState(false);

  const current = active && index < faults.length ? faults[index] : null;
  const done = responses.length >= faults.length;

  const resolve = React.useCallback((r: FaultResponse) => {
    setResponses((prev) => [...prev, r]);
    setIndex((i) => i + 1);
    setActive(false);
  }, []);

  const start = React.useCallback(() => {
    if (index < faults.length) setActive(true);
  }, [index, faults.length]);

  return { current, responses, done, resolve, start, remaining: faults.length - responses.length };
}
