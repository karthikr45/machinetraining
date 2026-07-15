'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Save, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { cn } from '@/lib/utils';
import type { OJTChecklistItem } from '@/lib/types';

const SECTION_ORDER = ['PRE-START CHECKS', 'MACHINE OPERATION', 'FAULT RESPONSE', 'DOCUMENTATION'];

type Result = 'PASS' | 'FAIL' | 'PENDING';

function groupBySection(items: OJTChecklistItem[]): [string, OJTChecklistItem[]][] {
  const map = new Map<string, OJTChecklistItem[]>();
  for (const it of items) {
    const arr = map.get(it.section) ?? [];
    arr.push(it);
    map.set(it.section, arr);
  }
  const sections = Array.from(map.keys()).sort(
    (a, b) => SECTION_ORDER.indexOf(a) - SECTION_ORDER.indexOf(b)
  );
  return sections.map((s) => [s, map.get(s)!]);
}

function ResultBadge({ result }: { result: Result }) {
  if (result === 'PASS') return <Badge variant="success">Pass</Badge>;
  if (result === 'FAIL') return <Badge variant="destructive">Fail</Badge>;
  return <Badge variant="gray">Pending</Badge>;
}

interface OJTChecklistProps {
  items: OJTChecklistItem[];
  /** Fully read-only (e.g. locked record). */
  disabled?: boolean;
  /** Controlled mode (creation flow): report every change to the parent. */
  onChange?: (items: OJTChecklistItem[]) => void;
  /** Persist mode (detail page): PUT changes to this record. */
  recordId?: string;
  overallResult?: Result;
  trainerComments?: string | null;
  traineeComments?: string | null;
  /** Trainer/manager may grade items, set overall result and trainer comments. */
  canAssess?: boolean;
  /** Trainee may edit their own acknowledgement comment. */
  canComment?: boolean;
}

export function OJTChecklist(props: OJTChecklistProps) {
  const persist = Boolean(props.recordId);
  const router = useRouter();
  const { toast } = useToast();

  const [items, setItems] = React.useState<OJTChecklistItem[]>(props.items);
  const [overall, setOverall] = React.useState<Result>(props.overallResult ?? 'PENDING');
  const [trainerComments, setTrainerComments] = React.useState(props.trainerComments ?? '');
  const [traineeComments, setTraineeComments] = React.useState(props.traineeComments ?? '');
  const [busy, setBusy] = React.useState(false);

  // Controlled mode: keep local state in sync with parent-provided items.
  React.useEffect(() => {
    if (!persist) setItems(props.items);
  }, [persist, props.items]);

  const editableItems = persist ? Boolean(props.canAssess) && !props.disabled : !props.disabled;

  function update(next: OJTChecklistItem[]) {
    setItems(next);
    if (!persist) props.onChange?.(next);
  }

  function setResult(id: number, result: Result) {
    update(items.map((it) => (it.id === id ? { ...it, result } : it)));
  }

  function setComment(id: number, comment: string) {
    update(items.map((it) => (it.id === id ? { ...it, comment } : it)));
  }

  const passCount = items.filter((i) => i.result === 'PASS').length;
  const failCount = items.filter((i) => i.result === 'FAIL').length;

  async function save() {
    if (!props.recordId) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      if (props.canAssess) {
        body.checklist = items;
        body.overallResult = overall;
        body.trainerComments = trainerComments;
      }
      if (props.canComment) {
        body.traineeComments = traineeComments;
      }
      await apiFetch(`/api/ojt/${props.recordId}`, { method: 'PUT', body: JSON.stringify(body) });
      toast({ title: 'Assessment saved' });
      router.refresh();
    } catch (err) {
      toast({ title: 'Save failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-pharma-success">
          <Check className="h-4 w-4" /> {passCount} passed
        </span>
        <span className="inline-flex items-center gap-1.5 text-destructive">
          <X className="h-4 w-4" /> {failCount} failed
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MinusCircle className="h-4 w-4" /> {items.length - passCount - failCount} pending
        </span>
      </div>

      {groupBySection(items).map(([section, sectionItems]) => (
        <div key={section} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pharma-blue">{section}</h3>
          <div className="space-y-3">
            {sectionItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm">
                    <span className="mr-1.5 font-medium text-muted-foreground">{item.id}.</span>
                    {item.text}
                  </p>
                  {editableItems ? (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={item.result === 'PASS' ? 'success' : 'outline'}
                        onClick={() => setResult(item.id, 'PASS')}
                      >
                        <Check className="h-4 w-4" /> Pass
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={item.result === 'FAIL' ? 'destructive' : 'outline'}
                        onClick={() => setResult(item.id, 'FAIL')}
                      >
                        <X className="h-4 w-4" /> Fail
                      </Button>
                    </div>
                  ) : (
                    <ResultBadge result={item.result} />
                  )}
                </div>
                {editableItems ? (
                  <Textarea
                    className="mt-2"
                    rows={1}
                    placeholder="Comment (optional)"
                    value={item.comment ?? ''}
                    onChange={(e) => setComment(item.id, e.target.value)}
                  />
                ) : item.comment ? (
                  <p className={cn('mt-2 text-sm text-muted-foreground')}>
                    <span className="font-medium">Note: </span>
                    {item.comment}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}

      {persist ? (
        <div className="space-y-4 border-t pt-4">
          {props.canAssess ? (
            <>
              <div className="space-y-2 sm:max-w-xs">
                <Label>Overall Result</Label>
                <Select
                  value={overall}
                  onValueChange={(v) => setOverall(v as Result)}
                  disabled={props.disabled}
                >
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
                <Label htmlFor="trainer-comments">Trainer Comments</Label>
                <Textarea
                  id="trainer-comments"
                  rows={3}
                  value={trainerComments}
                  onChange={(e) => setTrainerComments(e.target.value)}
                  disabled={props.disabled}
                  placeholder="Overall assessment notes"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <Label>Overall Result</Label>
              <div>
                <ResultBadge result={overall} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="trainee-comments">Trainee Comments</Label>
            <Textarea
              id="trainee-comments"
              rows={3}
              value={traineeComments}
              onChange={(e) => setTraineeComments(e.target.value)}
              disabled={props.disabled || !props.canComment}
              placeholder={props.canComment ? 'Your acknowledgement or feedback' : 'No trainee comments'}
            />
          </div>

          {!props.disabled && (props.canAssess || props.canComment) ? (
            <Button onClick={save} disabled={busy}>
              <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save Assessment'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
