'use client';

import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Hotspot {
  id: string;
  label: string;
  description: string;
}

export const HOTSPOTS: Hotspot[] = [
  {
    id: 'hopper',
    label: 'Hopper',
    description: 'Holds the granulated blend and feeds it into the feed frame under gravity.',
  },
  {
    id: 'turret',
    label: 'Turret',
    description: 'Rotating assembly carrying the upper and lower punches and dies.',
  },
  {
    id: 'compression',
    label: 'Compression Zone',
    description: 'Where the pre-compression and main compression rollers form the tablet.',
  },
  {
    id: 'control',
    label: 'Control Panel',
    description: 'HMI for setting speed, weight, hardness and monitoring in-process alarms.',
  },
];

export function HotspotManager({
  active,
  onSelect,
}: {
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  const activeSpot = HOTSPOTS.find((h) => h.id === active) ?? null;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
      <div className="pointer-events-auto flex flex-wrap gap-2">
        {HOTSPOTS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onSelect(active === h.id ? null : h.id)}
            aria-pressed={active === h.id}
            className={cn(
              'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-sm font-medium shadow-sm backdrop-blur transition-colors',
              active === h.id
                ? 'border-pharma-blue bg-pharma-blue text-white'
                : 'border-white/40 bg-white/80 text-slate-700 hover:bg-white'
            )}
          >
            <MapPin className="h-4 w-4" />
            {h.label}
          </button>
        ))}
      </div>

      {activeSpot && (
        <div className="pointer-events-auto max-w-md rounded-lg border bg-white/95 p-4 shadow-md backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{activeSpot.label}</h3>
              <p className="mt-1 text-sm text-slate-600">{activeSpot.description}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-xs font-medium text-pharma-blue hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
