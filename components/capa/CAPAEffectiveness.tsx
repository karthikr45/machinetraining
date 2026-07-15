'use client';

import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface CAPAEffectivenessProps {
  status: string;
  effectivenessCheck: string | null;
  effectivenessDate: string | null;
  closedAt: string | null;
}

export function CAPAEffectiveness({
  status,
  effectivenessCheck,
  effectivenessDate,
  closedAt,
}: CAPAEffectivenessProps) {
  const checked = Boolean(effectivenessCheck);
  const effective = checked && /effective/i.test(effectivenessCheck ?? '') &&
    !/ineffective|not yet|reopened/i.test(effectivenessCheck ?? '');

  const Icon = !checked ? ShieldQuestion : effective ? ShieldCheck : ShieldAlert;
  const iconColor = !checked
    ? 'text-muted-foreground'
    : effective
      ? 'text-pharma-success'
      : 'text-pharma-danger';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Effectiveness Check</span>
          {checked && (
            <Badge variant={effective ? 'success' : 'destructive'}>
              {effective ? 'Effective' : 'Not Demonstrated'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${iconColor}`} />
          <div className="space-y-1">
            {checked ? (
              <p className="text-sm">{effectivenessCheck}</p>
            ) : status === 'CLOSED' ? (
              <p className="text-sm text-muted-foreground">
                Awaiting effectiveness verification. It runs automatically on closure and confirms
                the linked training was completed within 30 days.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                The effectiveness check runs when this CAPA is closed — it verifies the operator
                completed the linked training within 30 days of closure.
              </p>
            )}
            {effectivenessDate && (
              <p className="text-xs text-muted-foreground">
                Verified: {formatDate(effectivenessDate)}
              </p>
            )}
            {closedAt && (
              <p className="text-xs text-muted-foreground">Closed: {formatDate(closedAt)}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
