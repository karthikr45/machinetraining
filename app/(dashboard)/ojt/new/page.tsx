'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ClipboardCheck, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { OJT_CHECKLIST_TEMPLATE, type OJTChecklistItem } from '@/lib/types';
import { OJTChecklist } from '@/components/ojt/OJTChecklist';
import { TrainerSelector, type UserOption } from '@/components/ojt/TrainerSelector';

interface MachineRow {
  id: string;
  name: string;
}

type Result = 'PASS' | 'FAIL' | 'PENDING';

function initialChecklist(): OJTChecklistItem[] {
  return OJT_CHECKLIST_TEMPLATE.map((t) => ({
    id: t.id,
    section: t.section,
    text: t.text,
    result: 'PENDING' as const,
  }));
}

export default function NewOJTPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = React.useState<1 | 2>(1);
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [machines, setMachines] = React.useState<MachineRow[]>([]);

  const [traineeId, setTraineeId] = React.useState('');
  const [trainerId, setTrainerId] = React.useState('');
  const [machineId, setMachineId] = React.useState('');
  const [sopVersion, setSopVersion] = React.useState('');

  const [checklist, setChecklist] = React.useState<OJTChecklistItem[]>(initialChecklist);
  const [overallResult, setOverallResult] = React.useState<Result>('PENDING');
  const [trainerComments, setTrainerComments] = React.useState('');
  const [traineeComments, setTraineeComments] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [rawUsers, machineRes] = await Promise.all([
          apiFetch<unknown>('/api/users'),
          apiFetch<{ machines: MachineRow[] }>('/api/machines'),
        ]);
        if (!active) return;
        const list: UserOption[] = Array.isArray(rawUsers)
          ? (rawUsers as UserOption[])
          : ((rawUsers as { users?: UserOption[] }).users ?? []);
        setUsers(list);
        setMachines(machineRes.machines);
      } catch (err) {
        if (active)
          toast({ title: 'Failed to load people or machines', description: (err as Error).message, variant: 'destructive' });
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  function goToStep2() {
    if (!traineeId) return toast({ title: 'Select a trainee', variant: 'destructive' });
    if (!trainerId) return toast({ title: 'Select a trainer', variant: 'destructive' });
    if (!machineId) return toast({ title: 'Select a machine', variant: 'destructive' });
    if (!sopVersion.trim()) return toast({ title: 'Enter the SOP version', variant: 'destructive' });
    setStep(2);
  }

  async function create() {
    setSubmitting(true);
    try {
      const res = await apiFetch<{ record: { id: string } }>('/api/ojt', {
        method: 'POST',
        body: JSON.stringify({
          traineeId,
          trainerId,
          machineId,
          sopVersion: sopVersion.trim(),
          checklist,
          overallResult,
          trainerComments: trainerComments.trim() || undefined,
          traineeComments: traineeComments.trim() || undefined,
        }),
      });
      toast({ title: 'OJT session created' });
      router.push(`/ojt/${res.record.id}`);
    } catch (err) {
      toast({ title: 'Could not create OJT session', description: (err as Error).message, variant: 'destructive' });
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/ojt">
            <ArrowLeft className="h-4 w-4" /> Back to OJT
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ClipboardCheck className="h-6 w-6 text-pharma-blue" /> New OJT Session
        </h1>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className={step === 1 ? 'font-semibold text-pharma-blue' : 'text-muted-foreground'}>
            1. Session details
          </span>
          <span className="text-slate-300">→</span>
          <span className={step === 2 ? 'font-semibold text-pharma-blue' : 'text-muted-foreground'}>
            2. Checklist &amp; result
          </span>
        </div>
      </div>

      {step === 1 ? (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Trainee</Label>
              <Select value={traineeId} onValueChange={setTraineeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the trainee" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.id !== trainerId)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="inline-flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {u.name}
                          {u.department ? (
                            <span className="text-muted-foreground">· {u.department}</span>
                          ) : null}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trainer / Assessor</Label>
              <TrainerSelector
                users={users}
                value={trainerId}
                onValueChange={setTrainerId}
                excludeUserId={traineeId || undefined}
              />
              <p className="text-xs text-muted-foreground">Only qualified trainers are listed.</p>
            </div>

            <div className="space-y-2">
              <Label>Machine</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sopVersion">SOP Version</Label>
              <Input
                id="sopVersion"
                value={sopVersion}
                onChange={(e) => setSopVersion(e.target.value)}
                placeholder="e.g. 1.0"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={goToStep2}>
                Next: Checklist <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">OJT Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <OJTChecklist items={checklist} onChange={setChecklist} />

            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2 sm:max-w-xs">
                <Label>Overall Result</Label>
                <Select value={overallResult} onValueChange={(v) => setOverallResult(v as Result)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PASS">Pass</SelectItem>
                    <SelectItem value="FAIL">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainerComments">Trainer Comments</Label>
                <Textarea
                  id="trainerComments"
                  rows={3}
                  value={trainerComments}
                  onChange={(e) => setTrainerComments(e.target.value)}
                  placeholder="Overall assessment notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="traineeComments">Trainee Comments</Label>
                <Textarea
                  id="traineeComments"
                  rows={3}
                  value={traineeComments}
                  onChange={(e) => setTraineeComments(e.target.value)}
                  placeholder="Trainee feedback (optional)"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={create} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                {submitting ? 'Creating…' : 'Create OJT Session'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
