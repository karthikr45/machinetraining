'use client';

import * as React from 'react';
import type { Industry } from '@prisma/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INDUSTRY_OPTIONS, type BasicInfo } from './types';

const REQUALIFY_OPTIONS = [
  { value: '6', label: 'Every 6 months' },
  { value: '12', label: 'Every 12 months' },
  { value: '24', label: 'Every 24 months' },
];

export function WizardStep1BasicInfo({
  value,
  errors,
  onChange,
}: {
  value: BasicInfo;
  errors: Partial<Record<keyof BasicInfo, string>>;
  onChange: (next: BasicInfo) => void;
}) {
  const set = <K extends keyof BasicInfo>(key: K, v: BasicInfo[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Basic information</h2>
        <p className="text-sm text-muted-foreground">Describe the equipment you are onboarding.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Machine name" required error={errors.name}>
          <Input
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Cadmach CMB-45 Tablet Press"
          />
        </Field>

        <Field label="Machine type" required error={errors.type}>
          <Input
            value={value.type}
            onChange={(e) => set('type', e.target.value)}
            placeholder="e.g. Rotary Tablet Press"
          />
        </Field>

        <Field label="Industry">
          <Select value={value.industry} onValueChange={(v) => set('industry', v as Industry)}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Requalification interval">
          <Select
            value={value.requalifyMonths}
            onValueChange={(v) => set('requalifyMonths', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUALIFY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Manufacturer">
          <Input
            value={value.manufacturer}
            onChange={(e) => set('manufacturer', e.target.value)}
            placeholder="e.g. Cadmach"
          />
        </Field>

        <Field label="Model number">
          <Input
            value={value.modelNumber}
            onChange={(e) => set('modelNumber', e.target.value)}
            placeholder="e.g. CMB-45"
          />
        </Field>

        <Field label="Year of manufacture" error={errors.yearOfMfg}>
          <Input
            type="number"
            inputMode="numeric"
            value={value.yearOfMfg}
            onChange={(e) => set('yearOfMfg', e.target.value)}
            placeholder="e.g. 2021"
          />
        </Field>

        <Field label="Location">
          <Input
            value={value.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. Block B — Compression Room 2"
          />
        </Field>
      </div>

      <Field label="Description">
        <Textarea
          value={value.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Short description of the machine and its role in the process."
          rows={3}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
