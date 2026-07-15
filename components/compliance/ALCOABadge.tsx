'use client';

import { ShieldCheck } from 'lucide-react';
import { ALCOA_PRINCIPLES } from '@/lib/alcoa';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ALCOABadgeProps {
  className?: string;
  /** Compact renders letters only; full shows the principle name too. */
  variant?: 'compact' | 'full';
}

/**
 * Renders the nine ALCOA+ data-integrity principles as gold-gradient badges,
 * each with a tooltip describing the principle.
 */
export function ALCOABadge({ className, variant = 'full' }: ALCOABadgeProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
          <ShieldCheck className="h-4 w-4" />
          ALCOA+
        </span>
        {ALCOA_PRINCIPLES.map((p, i) => (
          <Tooltip key={`${p.name}-${i}`}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-gradient-to-br from-amber-100 via-amber-200 to-yellow-300 px-2.5 py-0.5 text-xs font-semibold text-amber-900 shadow-sm transition-transform hover:scale-105',
                  variant === 'compact' && 'px-2'
                )}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/90 text-[10px] font-bold text-white">
                  {p.letter}
                </span>
                {variant === 'full' && <span>{p.name}</span>}
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-amber-900 text-white">
              <p className="font-semibold">{p.name}</p>
              <p className="text-amber-100">{p.desc}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
