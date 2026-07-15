'use client';

import { AlertOctagon, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpiryAlertBannerProps {
  expired: number;
  expiring: number;
}

export function ExpiryAlertBanner({ expired, expiring }: ExpiryAlertBannerProps) {
  if (expired === 0 && expiring === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-pharma-success/30 bg-pharma-success/10 p-4">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-pharma-success" />
        <div>
          <p className="font-semibold text-pharma-success">All qualifications current</p>
          <p className="text-sm text-muted-foreground">
            No expired or expiring certifications across your operators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <BannerTile
        active={expired > 0}
        count={expired}
        label="Expired certifications"
        sub="Immediate requalification required"
        Icon={AlertOctagon}
        tone="danger"
      />
      <BannerTile
        active={expiring > 0}
        count={expiring}
        label="Expiring within 30 days"
        sub="Schedule requalification soon"
        Icon={Clock}
        tone="warning"
      />
    </div>
  );
}

function BannerTile({
  active,
  count,
  label,
  sub,
  Icon,
  tone,
}: {
  active: boolean;
  count: number;
  label: string;
  sub: string;
  Icon: typeof AlertOctagon;
  tone: 'danger' | 'warning';
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border p-4',
        !active && 'opacity-60',
        tone === 'danger'
          ? 'border-pharma-danger/30 bg-pharma-danger/10'
          : 'border-pharma-warning/30 bg-pharma-warning/10'
      )}
    >
      <Icon
        className={cn(
          'h-8 w-8 shrink-0',
          tone === 'danger' ? 'text-pharma-danger' : 'text-pharma-warning'
        )}
      />
      <div>
        <p
          className={cn(
            'text-2xl font-bold leading-none',
            tone === 'danger' ? 'text-pharma-danger' : 'text-pharma-warning'
          )}
        >
          {count}
        </p>
        <p className="mt-1 text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
