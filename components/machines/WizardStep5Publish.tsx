'use client';

import { ShieldCheck, Rocket } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REGULATORY_FRAMEWORKS } from './types';

export function WizardStep5Publish({
  machineName,
  moduleCount,
  framework,
  onFrameworkChange,
}: {
  machineName: string;
  moduleCount: number;
  framework: string;
  onFrameworkChange: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Publish</h2>
        <p className="text-sm text-muted-foreground">
          Publishing makes {machineName} available to operators for training and assessment.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Regulatory framework
        </Label>
        <Select value={framework} onValueChange={onFrameworkChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGULATORY_FRAMEWORKS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Training content and records for this machine will reference this framework for audit
          traceability.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border bg-pharma-blue/5 p-4">
        <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-pharma-blue" />
        <div className="text-sm">
          <p className="font-medium">Ready to publish</p>
          <p className="text-muted-foreground">
            {moduleCount > 0
              ? `${moduleCount} training module(s) will be published with this machine.`
              : 'No modules yet — you can add training modules after publishing.'}
          </p>
        </div>
      </div>
    </div>
  );
}
