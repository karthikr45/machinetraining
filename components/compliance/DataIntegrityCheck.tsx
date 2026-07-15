'use client';

import { CheckCircle2, Database, Fingerprint, Clock, Lock, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface IntegrityIndicator {
  label: string;
  detail: string;
  icon: typeof Database;
}

const INDICATORS: IntegrityIndicator[] = [
  { label: 'Attributable', detail: 'Every action linked to an authenticated user', icon: Fingerprint },
  { label: 'Contemporaneous', detail: 'Server-side timestamps, never client time', icon: Clock },
  { label: 'Enduring', detail: 'Immutable append-only audit log in PostgreSQL', icon: Database },
  { label: 'Original', detail: 'Primary source records preserved on write', icon: FileCheck },
  { label: 'Locked', detail: 'Signed records locked against modification', icon: Lock },
];

/**
 * Small panel surfacing the platform's ALCOA+ data-integrity controls.
 */
export function DataIntegrityCheck({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-pharma-blue" />
            Data Integrity
          </span>
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Compliant
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {INDICATORS.map((ind) => {
          const Icon = ind.icon;
          return (
            <div key={ind.label} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pharma-blue/10">
                <Icon className="h-4 w-4 text-pharma-blue" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ind.label}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-pharma-success" />
                </div>
                <p className="text-xs text-muted-foreground">{ind.detail}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
