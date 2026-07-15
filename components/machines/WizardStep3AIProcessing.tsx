'use client';

import * as React from 'react';
import { Sparkles, Loader2, CheckCircle2, BookOpen, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { MODULE_TYPE_LABELS, type DocumentDTO, type ModuleSummary, type ProcessResult } from './types';

interface ModulesResponse {
  modules: {
    id: string;
    title: string;
    moduleType: ModuleSummary['moduleType'];
    order: number;
    estimatedMinutes: number;
    quiz: { id: string } | null;
  }[];
}

export function WizardStep3AIProcessing({
  machineId,
  documents,
  onDocumentsChange,
  modules,
  onModulesChange,
}: {
  machineId: string;
  documents: DocumentDTO[];
  onDocumentsChange: (docs: DocumentDTO[]) => void;
  modules: ModuleSummary[];
  onModulesChange: (modules: ModuleSummary[]) => void;
}) {
  const { toast } = useToast();
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [done, setDone] = React.useState(modules.length > 0);

  const refreshModules = React.useCallback(async () => {
    const res = await apiFetch<ModulesResponse>(`/api/modules?machineId=${machineId}`);
    onModulesChange(
      res.modules.map((m) => ({
        id: m.id,
        title: m.title,
        moduleType: m.moduleType,
        order: m.order,
        estimatedMinutes: m.estimatedMinutes,
        hasQuiz: Boolean(m.quiz),
      }))
    );
  }, [machineId, onModulesChange]);

  const generate = async () => {
    if (documents.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No documents',
        description: 'Upload at least one manual in the previous step to generate training.',
      });
      return;
    }
    setRunning(true);
    setProgress(5);
    try {
      const total = documents.length;
      let created = 0;
      for (let i = 0; i < total; i += 1) {
        const doc = documents[i];
        const result = await apiFetch<ProcessResult>('/api/documents/process?generate=true', {
          method: 'POST',
          body: JSON.stringify({ documentId: doc.id, generateModules: true }),
        });
        created += result.createdModules;
        onDocumentsChange(
          documents.map((d) => (d.id === doc.id ? { ...d, processed: true } : d))
        );
        setProgress(Math.round(((i + 1) / total) * 90) + 5);
      }
      await refreshModules();
      setProgress(100);
      setDone(true);
      toast({
        title: 'Training generated',
        description: `${created} module(s) created from ${total} document(s).`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Processing failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">AI training generation</h2>
        <p className="text-sm text-muted-foreground">
          We extract text from your documents and draft GMP-aligned training modules and quizzes.
          If the AI service is not configured, a structured starter module is created instead.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <FileWarning className="h-5 w-5 shrink-0 text-pharma-warning" />
          <span>
            No documents uploaded. You can go back to add manuals, or continue and build modules
            manually later.
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={generate} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {done ? 'Regenerate training' : 'Generate AI training'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {documents.length} document(s) ready
            </span>
          </div>

          {(running || done) && (
            <div className="space-y-1.5">
              <Progress value={progress} indicatorClassName="bg-pharma-blue" />
              <p className="text-xs text-muted-foreground">
                {running ? 'Processing documents…' : 'Completed'}
              </p>
            </div>
          )}
        </div>
      )}

      {modules.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-pharma-success" />
            Generated modules
          </div>
          <ul className="divide-y rounded-lg border">
            {modules.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3">
                <BookOpen className="h-5 w-5 shrink-0 text-pharma-blue" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {MODULE_TYPE_LABELS[m.moduleType]} · {m.estimatedMinutes} min
                  </p>
                </div>
                {m.hasQuiz && <Badge variant="purple">Quiz</Badge>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
