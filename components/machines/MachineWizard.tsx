'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Industry } from '@prisma/client';
import { Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { cn } from '@/lib/utils';
import { WizardStep1BasicInfo } from './WizardStep1BasicInfo';
import { WizardStep2Documents } from './WizardStep2Documents';
import { WizardStep3AIProcessing } from './WizardStep3AIProcessing';
import { WizardStep4Review } from './WizardStep4Review';
import { WizardStep5Publish } from './WizardStep5Publish';
import type {
  BasicInfo,
  CreatedMachine,
  DocumentDTO,
  ModuleSummary,
  SopOption,
} from './types';

const STEPS = ['Basic Info', 'Documents', 'AI Training', 'Review', 'Publish'] as const;

function emptyBasicInfo(industry: Industry): BasicInfo {
  return {
    name: '',
    type: '',
    industry,
    manufacturer: '',
    modelNumber: '',
    yearOfMfg: '',
    location: '',
    description: '',
    requalifyMonths: '12',
  };
}

export function MachineWizard({ defaultIndustry }: { defaultIndustry: Industry }) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = React.useState(1);
  const [basic, setBasic] = React.useState<BasicInfo>(() => emptyBasicInfo(defaultIndustry));
  const [machine, setMachine] = React.useState<CreatedMachine | null>(null);
  const [documents, setDocuments] = React.useState<DocumentDTO[]>([]);
  const [linkedSopIds, setLinkedSopIds] = React.useState<string[]>([]);
  const [availableSops, setAvailableSops] = React.useState<SopOption[]>([]);
  const [modules, setModules] = React.useState<ModuleSummary[]>([]);
  const [framework, setFramework] = React.useState('SCHEDULE_M');

  const [savingBasic, setSavingBasic] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof BasicInfo, string>>>({});

  const validateBasic = React.useCallback((): boolean => {
    const next: Partial<Record<keyof BasicInfo, string>> = {};
    if (!basic.name.trim()) next.name = 'Machine name is required.';
    if (!basic.type.trim()) next.type = 'Machine type is required.';
    if (basic.yearOfMfg) {
      const y = Number(basic.yearOfMfg);
      if (!Number.isFinite(y) || y < 1950 || y > new Date().getFullYear() + 1) {
        next.yearOfMfg = 'Enter a valid manufacturing year.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [basic]);

  const persistMachine = React.useCallback(async () => {
    const payload = {
      name: basic.name.trim(),
      type: basic.type.trim(),
      industry: basic.industry,
      manufacturer: basic.manufacturer.trim() || null,
      modelNumber: basic.modelNumber.trim() || null,
      yearOfMfg: basic.yearOfMfg ? Number(basic.yearOfMfg) : null,
      location: basic.location.trim() || null,
      description: basic.description.trim() || null,
      requalifyMonths: Number(basic.requalifyMonths) || 12,
    };
    if (machine) {
      const res = await apiFetch<{ machine: CreatedMachine }>(`/api/machines/${machine.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setMachine(res.machine);
      return res.machine;
    }
    const res = await apiFetch<{ machine: CreatedMachine }>('/api/machines', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setMachine(res.machine);
    return res.machine;
  }, [basic, machine]);

  const handleBasicNext = async () => {
    if (!validateBasic()) return;
    setSavingBasic(true);
    try {
      await persistMachine();
      setStep(2);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not save machine',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSavingBasic(false);
    }
  };

  const handlePublish = async () => {
    if (!machine) return;
    setPublishing(true);
    try {
      await apiFetch(`/api/machines/${machine.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      toast({ title: 'Machine published', description: `${machine.name} is now live.` });
      router.push(`/machines/${machine.id}`);
      router.refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Publish failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Stepper current={step} />

      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <WizardStep1BasicInfo value={basic} errors={errors} onChange={setBasic} />
          )}
          {step === 2 && machine && (
            <WizardStep2Documents
              machineId={machine.id}
              documents={documents}
              onDocumentsChange={setDocuments}
              availableSops={availableSops}
              onAvailableSopsChange={setAvailableSops}
              linkedSopIds={linkedSopIds}
              onLinkedSopIdsChange={setLinkedSopIds}
            />
          )}
          {step === 3 && machine && (
            <WizardStep3AIProcessing
              machineId={machine.id}
              documents={documents}
              onDocumentsChange={setDocuments}
              modules={modules}
              onModulesChange={setModules}
            />
          )}
          {step === 4 && machine && (
            <WizardStep4Review
              basic={basic}
              documents={documents}
              linkedSopCount={linkedSopIds.length}
              modules={modules}
            />
          )}
          {step === 5 && machine && (
            <WizardStep5Publish
              machineName={machine.name}
              moduleCount={modules.length}
              framework={framework}
              onFrameworkChange={setFramework}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || savingBasic || publishing}
        >
          Back
        </Button>

        {step === 1 && (
          <Button type="button" onClick={handleBasicNext} disabled={savingBasic}>
            {savingBasic && <Loader2 className="h-4 w-4 animate-spin" />}
            Save & Continue
          </Button>
        )}
        {(step === 2 || step === 3 || step === 4) && (
          <Button type="button" onClick={() => setStep((s) => Math.min(5, s + 1))}>
            Continue
          </Button>
        )}
        {step === 5 && (
          <Button type="button" onClick={handlePublish} disabled={publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Publish Machine
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                  active && 'border-pharma-blue bg-pharma-blue text-white',
                  done && 'border-pharma-success bg-pharma-success text-white',
                  !active && !done && 'border-input bg-background text-muted-foreground'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-sm font-medium',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {n < STEPS.length && <span className="hidden h-px flex-1 bg-border sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}
