'use client';

import { BookOpen, FileText, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  INDUSTRY_OPTIONS,
  MODULE_TYPE_LABELS,
  type BasicInfo,
  type DocumentDTO,
  type ModuleSummary,
} from './types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-right">{value || '—'}</dd>
    </div>
  );
}

export function WizardStep4Review({
  basic,
  documents,
  linkedSopCount,
  modules,
}: {
  basic: BasicInfo;
  documents: DocumentDTO[];
  linkedSopCount: number;
  modules: ModuleSummary[];
}) {
  const industryLabel =
    INDUSTRY_OPTIONS.find((o) => o.value === basic.industry)?.label ?? basic.industry;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review</h2>
        <p className="text-sm text-muted-foreground">
          Confirm everything looks right before publishing.
        </p>
      </div>

      <section className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">Machine details</h3>
        <dl className="divide-y">
          <Row label="Name" value={basic.name} />
          <Row label="Type" value={basic.type} />
          <Row label="Industry" value={industryLabel} />
          <Row label="Manufacturer" value={basic.manufacturer} />
          <Row label="Model number" value={basic.modelNumber} />
          <Row label="Year of manufacture" value={basic.yearOfMfg} />
          <Row label="Location" value={basic.location} />
          <Row label="Requalify every" value={`${basic.requalifyMonths} months`} />
        </dl>
        {basic.description && (
          <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">{basic.description}</p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <FileText className="h-6 w-6 text-pharma-blue" />
          <div>
            <p className="text-lg font-semibold">{documents.length}</p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Link2 className="h-6 w-6 text-pharma-teal" />
          <div>
            <p className="text-lg font-semibold">{linkedSopCount}</p>
            <p className="text-xs text-muted-foreground">Linked SOPs</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <BookOpen className="h-6 w-6 text-pharma-purple" />
          <div>
            <p className="text-lg font-semibold">{modules.length}</p>
            <p className="text-xs text-muted-foreground">Training modules</p>
          </div>
        </div>
      </section>

      {modules.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Modules</h3>
          <ul className="divide-y rounded-lg border">
            {modules.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3">
                <span className="text-sm font-medium">{m.title}</span>
                <Badge variant="secondary" className="ml-auto">
                  {MODULE_TYPE_LABELS[m.moduleType]}
                </Badge>
                {m.hasQuiz && <Badge variant="purple">Quiz</Badge>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
