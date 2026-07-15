'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import type { CAPASeverityValue } from './CAPACard';

const SEVERITY_OPTIONS: { value: CAPASeverityValue; label: string }[] = [
  { value: 'MINOR', label: 'Minor' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'CRITICAL', label: 'Critical' },
];

const DEVIATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'WEIGHT_VARIATION', label: 'Weight Variation' },
  { value: 'EQUIPMENT_FAILURE', label: 'Equipment Failure' },
  { value: 'DOCUMENTATION_ERROR', label: 'Documentation Error' },
  { value: 'PROCESS_DEVIATION', label: 'Process Deviation' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'PERSONNEL', label: 'Personnel' },
  { value: 'OTHER', label: 'Other' },
];

const COMMON_ROOT_CAUSES: string[] = [
  'Inadequate operator training / competency',
  'SOP not followed as written',
  'SOP unclear, outdated, or unavailable',
  'Equipment malfunction or miscalibration',
  'Inadequate supervision during operation',
  'Human error / momentary lapse',
  'Insufficient competency assessment before qualification',
  'Environmental conditions outside limits',
  'Documentation gap / incomplete records',
];

const NONE = '__none__';

interface Option {
  id: string;
  name: string;
}

export function CAPAForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [machines, setMachines] = useState<Option[]>([]);
  const [users, setUsers] = useState<Option[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<CAPASeverityValue | ''>('');
  const [deviationType, setDeviationType] = useState('');
  const [machineId, setMachineId] = useState<string>(NONE);
  const [ownerId, setOwnerId] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [m, u] = await Promise.all([
          apiFetch<{ machines: { id: string; name: string }[] }>('/api/machines'),
          apiFetch<{ users: { id: string; name: string }[] }>('/api/users'),
        ]);
        if (!active) return;
        setMachines(m.machines.map((x) => ({ id: x.id, name: x.name })));
        setUsers(u.users.map((x) => ({ id: x.id, name: x.name })));
      } catch (err) {
        if (active) {
          toast({
            variant: 'destructive',
            title: 'Could not load machines/owners',
            description: err instanceof Error ? err.message : 'Please retry.',
          });
        }
      } finally {
        if (active) setLoadingRefs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast({ variant: 'destructive', title: 'Title is required' });
    if (!description.trim())
      return toast({ variant: 'destructive', title: 'Description is required' });
    if (!severity) return toast({ variant: 'destructive', title: 'Severity is required' });
    if (!deviationType)
      return toast({ variant: 'destructive', title: 'Deviation type is required' });
    if (!ownerId) return toast({ variant: 'destructive', title: 'Owner is required' });
    if (!dueDate) return toast({ variant: 'destructive', title: 'Due date is required' });

    setSubmitting(true);
    try {
      const res = await apiFetch<{ capa: { id: string; capaNumber: string } }>('/api/capa', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          severity,
          deviationType,
          machineId: machineId === NONE ? null : machineId,
          ownerId,
          dueDate: new Date(dueDate).toISOString(),
          immediateAction: immediateAction.trim() || null,
          rootCause: rootCause.trim() || null,
          preventiveAction: preventiveAction.trim() || null,
        }),
      });
      toast({ title: 'CAPA created', description: res.capa.capaNumber });
      router.push(`/capa/${res.capa.id}`);
      router.refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not create CAPA',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CAPA Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="capa-title">Title</Label>
            <Input
              id="capa-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the corrective/preventive action"
              maxLength={160}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capa-description">Description</Label>
            <Textarea
              id="capa-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the deviation, the impact, and the context."
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as CAPASeverityValue)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Deviation Type</Label>
              <Select value={deviationType} onValueChange={setDeviationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select deviation type" />
                </SelectTrigger>
                <SelectContent>
                  {DEVIATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Linked Machine (optional)</Label>
              <Select value={machineId} onValueChange={setMachineId} disabled={loadingRefs}>
                <SelectTrigger>
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No machine</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId} disabled={loadingRefs}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign owner" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capa-due">Due Date</Label>
              <Input
                id="capa-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investigation &amp; Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="capa-immediate">Immediate Action (optional)</Label>
            <Textarea
              id="capa-immediate"
              value={immediateAction}
              onChange={(e) => setImmediateAction(e.target.value)}
              placeholder="Containment / immediate correction taken."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Common Root Cause (optional)</Label>
            <Select value="" onValueChange={(v) => setRootCause(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a common root cause to prefill" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_ROOT_CAUSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Root cause (5-Why analysis). Prefill from the list above or type your own."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capa-preventive">Preventive Action (optional)</Label>
            <Textarea
              id="capa-preventive"
              value={preventiveAction}
              onChange={(e) => setPreventiveAction(e.target.value)}
              placeholder="Preventive action to stop recurrence."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/capa')}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create CAPA
        </Button>
      </div>
    </form>
  );
}
