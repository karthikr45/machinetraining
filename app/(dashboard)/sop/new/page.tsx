'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FilePlus2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { SOPUploader } from '@/components/sop/SOPUploader';

interface MachineRow {
  id: string;
  name: string;
}

interface CreatedSop {
  sop: { id: string };
}

export default function NewSOPPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [machines, setMachines] = React.useState<MachineRow[]>([]);
  const [sopNumber, setSopNumber] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [machineId, setMachineId] = React.useState('none');
  const [version, setVersion] = React.useState('1.0');
  const [effectiveDate, setEffectiveDate] = React.useState('');
  const [reviewDate, setReviewDate] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<{ machines: MachineRow[] }>('/api/machines');
        if (active) setMachines(res.machines);
      } catch (err) {
        if (active)
          toast({ title: 'Failed to load machines', description: (err as Error).message, variant: 'destructive' });
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sopNumber.trim()) {
      toast({ title: 'SOP number is required', variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set('sopNumber', sopNumber.trim());
      form.set('title', title.trim());
      form.set('version', version.trim() || '1.0');
      if (machineId !== 'none') form.set('machineId', machineId);
      if (effectiveDate) form.set('effectiveDate', effectiveDate);
      if (reviewDate) form.set('reviewDate', reviewDate);
      if (file) form.set('file', file);

      const res = await fetch('/api/sop', { method: 'POST', body: form });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      toast({ title: 'SOP created', description: `${sopNumber} v${version} saved as draft.` });
      router.push(`/sop/${(data as CreatedSop).sop.id}`);
    } catch (err) {
      toast({ title: 'Could not create SOP', description: (err as Error).message, variant: 'destructive' });
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/sop">
            <ArrowLeft className="h-4 w-4" /> Back to SOP Library
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FilePlus2 className="h-6 w-6 text-pharma-blue" /> Upload New SOP
        </h1>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">SOP Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sopNumber">SOP Number *</Label>
                <Input
                  id="sopNumber"
                  value={sopNumber}
                  onChange={(e) => setSopNumber(e.target.value)}
                  placeholder="e.g. SOP-PROD-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operation of Cadmach Tablet Press"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Linked Machine</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a machine (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No machine</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewDate">Next Review Date</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                />
              </div>
            </div>

            <SOPUploader file={file} onFileSelected={setFile} disabled={submitting} />

            <div className="flex justify-end gap-3 pt-2">
              <Button asChild variant="outline" type="button">
                <Link href="/sop">Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                {submitting ? 'Saving…' : 'Create SOP'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
