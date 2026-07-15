'use client';

import { useState } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { cn } from '@/lib/utils';
import { CAPA_STATUS_OPTIONS, type CAPAStatusValue } from './CAPACard';

const WORKFLOW_STEPS: { value: CAPAStatusValue; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'INVESTIGATION', label: 'Investigation' },
  { value: 'ACTION_TAKEN', label: 'Action Taken' },
  { value: 'VERIFICATION', label: 'Verification' },
  { value: 'CLOSED', label: 'Closed' },
];

export interface StatusChangeResult {
  capa: { status: CAPAStatusValue; closedAt: string | null; effectivenessCheck: string | null };
  effectiveness: { effective: boolean; message: string } | null;
}

interface CAPAWorkflowProps {
  capaId: string;
  status: CAPAStatusValue;
  canManage: boolean;
  onChanged?: (result: StatusChangeResult) => void;
}

function stepIndex(status: CAPAStatusValue): number {
  const idx = WORKFLOW_STEPS.findIndex((s) => s.value === status);
  // OVERDUE has no workflow position — treat as "in progress" (index 0).
  return idx === -1 ? 0 : idx;
}

export function CAPAWorkflow({ capaId, status, canManage, onChanged }: CAPAWorkflowProps) {
  const { toast } = useToast();
  const [target, setTarget] = useState<CAPAStatusValue>(status);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  const currentIndex = stepIndex(status);
  const isOverdue = status === 'OVERDUE';

  async function submit() {
    if (target === status) {
      toast({ variant: 'destructive', title: 'Select a different status to update' });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<StatusChangeResult>(`/api/capa/${capaId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: target, comments: comments.trim() || undefined }),
      });
      const label = CAPA_STATUS_OPTIONS.find((o) => o.value === res.capa.status)?.label;
      toast({
        title: 'Status updated',
        description: res.effectiveness
          ? res.effectiveness.message
          : `CAPA is now ${label ?? res.capa.status}.`,
      });
      setComments('');
      onChanged?.(res);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not update status',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Workflow</span>
          {isOverdue && <Badge variant="destructive">Overdue</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
          {WORKFLOW_STEPS.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex && !isOverdue;
            return (
              <li key={step.value} className="flex items-center gap-2 sm:flex-1">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    done && 'border-pharma-success bg-pharma-success text-white',
                    active && 'border-pharma-blue bg-pharma-blue text-white',
                    !done && !active && 'border-border bg-muted text-muted-foreground'
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    active ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-1 hidden h-0.5 flex-1 sm:block',
                      i < currentIndex ? 'bg-pharma-success' : 'bg-border'
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {canManage ? (
          <div className="space-y-3 border-t pt-4">
            <div className="space-y-1.5">
              <Label>Advance status</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as CAPAStatusValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAPA_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status-comments">Comments (audit trail)</Label>
              <Textarea
                id="status-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Reason for the status change."
                rows={2}
              />
            </div>
            <Button onClick={submit} disabled={saving || target === status}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Update Status
            </Button>
          </div>
        ) : (
          <p className="border-t pt-4 text-sm text-muted-foreground">
            Only managers can advance the CAPA workflow.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
