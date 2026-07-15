'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { MachineStatus } from '@prisma/client';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { WizardStep1BasicInfo } from '@/components/machines/WizardStep1BasicInfo';
import { MACHINE_STATUS_META, type BasicInfo } from '@/components/machines/types';

interface MachineResponse {
  machine: {
    id: string;
    name: string;
    type: string;
    industry: BasicInfo['industry'];
    manufacturer: string | null;
    modelNumber: string | null;
    yearOfMfg: number | null;
    location: string | null;
    description: string | null;
    requalifyMonths: number;
    status: MachineStatus;
  };
}

const STATUS_ORDER: MachineStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export default function EditMachinePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const [basic, setBasic] = React.useState<BasicInfo | null>(null);
  const [status, setStatus] = React.useState<MachineStatus>('DRAFT');
  const [errors, setErrors] = React.useState<Partial<Record<keyof BasicInfo, string>>>({});

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<MachineResponse>(`/api/machines/${params.id}`);
        if (!active) return;
        const m = res.machine;
        setBasic({
          name: m.name,
          type: m.type,
          industry: m.industry,
          manufacturer: m.manufacturer ?? '',
          modelNumber: m.modelNumber ?? '',
          yearOfMfg: m.yearOfMfg ? String(m.yearOfMfg) : '',
          location: m.location ?? '',
          description: m.description ?? '',
          requalifyMonths: String(m.requalifyMonths),
        });
        setStatus(m.status);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  const save = async () => {
    if (!basic) return;
    const nextErrors: Partial<Record<keyof BasicInfo, string>> = {};
    if (!basic.name.trim()) nextErrors.name = 'Machine name is required.';
    if (!basic.type.trim()) nextErrors.type = 'Machine type is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await apiFetch(`/api/machines/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: basic.name.trim(),
          type: basic.type.trim(),
          industry: basic.industry,
          manufacturer: basic.manufacturer.trim() || null,
          modelNumber: basic.modelNumber.trim() || null,
          yearOfMfg: basic.yearOfMfg ? Number(basic.yearOfMfg) : null,
          location: basic.location.trim() || null,
          description: basic.description.trim() || null,
          requalifyMonths: Number(basic.requalifyMonths) || 12,
          status,
        }),
      });
      toast({ title: 'Saved', description: 'Machine updated successfully.' });
      router.push(`/machines/${params.id}`);
      router.refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/machines/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to machine
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Edit machine</h1>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-9 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : notFound || !basic ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              This machine could not be found.
            </p>
          ) : (
            <>
              <WizardStep1BasicInfo value={basic} errors={errors} onChange={setBasic} />

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as MachineStatus)}>
                  <SelectTrigger className="sm:max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {MACHINE_STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!loading && !notFound && basic && (
        <div className="flex justify-end gap-3">
          <Button asChild variant="outline">
            <Link href={`/machines/${params.id}`}>Cancel</Link>
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}
