'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PenLine, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { formatDateTime } from '@/lib/utils';

interface SignPanelProps {
  role: 'trainer' | 'trainee';
  title: string;
  personName: string;
  signedAt: string | Date | null;
  canSign: boolean;
  locked: boolean;
  onSign: (role: 'trainer' | 'trainee', password: string) => Promise<void>;
}

function SignPanel({ role, title, personName, signedAt, canSign, locked, onSign }: SignPanelProps) {
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const signed = Boolean(signedAt);

  async function submit() {
    if (!password) return;
    setBusy(true);
    try {
      await onSign(role, password);
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>{title}</span>
          {signed ? <CheckCircle2 className="h-5 w-5 text-pharma-success" /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {personName}
        </p>
        {signed ? (
          <div className="rounded-lg border border-pharma-success/30 bg-green-50 px-3 py-2 text-sm text-pharma-success">
            <span className="font-medium">Signed</span> · {formatDateTime(signedAt)}
          </div>
        ) : canSign && !locked ? (
          <div className="space-y-2">
            <Label htmlFor={`pwd-${role}`}>Re-enter your password to sign</Label>
            <Input
              id={`pwd-${role}`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <Button className="w-full" onClick={submit} disabled={busy || !password}>
              <PenLine className="h-4 w-4" /> {busy ? 'Signing…' : 'Apply Signature'}
            </Button>
            <p className="text-xs text-muted-foreground">
              21 CFR Part 11 electronic signature. Your identity, meaning and a server timestamp are recorded.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
            Awaiting signature{canSign ? '' : ` from ${personName}`}.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OJTSignOff({
  recordId,
  trainerName,
  traineeName,
  trainerSignedAt,
  traineeSignedAt,
  locked,
  canSignTrainer,
  canSignTrainee,
}: {
  recordId: string;
  trainerName: string;
  traineeName: string;
  trainerSignedAt: string | Date | null;
  traineeSignedAt: string | Date | null;
  locked: boolean;
  canSignTrainer: boolean;
  canSignTrainee: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function sign(role: 'trainer' | 'trainee', password: string) {
    try {
      const res = await apiFetch<{ locked: boolean }>(`/api/ojt/${recordId}/sign`, {
        method: 'POST',
        body: JSON.stringify({ role, password }),
      });
      toast({
        title: 'Signature applied',
        description: res.locked ? 'Both parties have signed — record is now locked.' : undefined,
        variant: 'success',
      });
      router.refresh();
    } catch (err) {
      toast({ title: 'Signature rejected', description: (err as Error).message, variant: 'destructive' });
      throw err;
    }
  }

  return (
    <div className="space-y-4">
      {locked ? (
        <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
          <div>
            <p className="font-semibold">Record LOCKED</p>
            <p className="text-sm text-muted-foreground">
              This OJT record is complete and immutable under ALCOA+ (Attributable, Legible,
              Contemporaneous, Original, Accurate, and Enduring). No further edits or signatures are
              permitted; the full history is retained in the audit trail.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-pharma-blue/20 bg-blue-50 px-4 py-2.5 text-sm text-pharma-blue">
          <ShieldCheck className="h-4 w-4" />
          Both the trainer and trainee must sign. The record locks automatically once both signatures are applied.
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SignPanel
          role="trainer"
          title="Trainer Sign-off"
          personName={trainerName}
          signedAt={trainerSignedAt}
          canSign={canSignTrainer}
          locked={locked}
          onSign={sign}
        />
        <SignPanel
          role="trainee"
          title="Trainee Acknowledgement"
          personName={traineeName}
          signedAt={traineeSignedAt}
          canSign={canSignTrainee}
          locked={locked}
          onSign={sign}
        />
      </div>
    </div>
  );
}
