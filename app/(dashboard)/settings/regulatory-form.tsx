'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { RegulatoryFramework } from '@prisma/client';
import { REGULATORY_LABELS } from './regulatory-labels';

const FRAMEWORKS = Object.entries(REGULATORY_LABELS) as [RegulatoryFramework, string][];

export function RegulatoryForm({ initial }: { initial: RegulatoryFramework }) {
  const router = useRouter();
  const { toast } = useToast();

  const [framework, setFramework] = useState<RegulatoryFramework>(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch('/api/company', {
        method: 'PUT',
        body: JSON.stringify({ regulatoryFramework: framework }),
      });
      toast({
        title: 'Company updated',
        description: `Regulatory framework set to ${REGULATORY_LABELS[framework]}.`,
      });
      router.refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="framework">Regulatory framework</Label>
        <Select
          value={framework}
          onValueChange={(v) => setFramework(v as RegulatoryFramework)}
        >
          <SelectTrigger id="framework">
            <SelectValue placeholder="Select framework" />
          </SelectTrigger>
          <SelectContent>
            {FRAMEWORKS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSave} disabled={saving || framework === initial}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save
      </Button>
    </div>
  );
}
