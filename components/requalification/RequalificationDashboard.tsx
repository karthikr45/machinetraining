'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Send, Loader2, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ExpiryAlertBanner } from './ExpiryAlertBanner';
import {
  RequalificationMatrix,
  cellKey,
  type MatrixData,
  type CellStatus,
} from './RequalificationMatrix';

interface RequalRecordDTO {
  recordId: string;
  userId: string;
  userName: string;
  department: string | null;
  machineId: string;
  machineName: string;
  expiryDate: string | null;
}

interface CheckResponse {
  total: number;
  expired: RequalRecordDTO[];
  expiring: RequalRecordDTO[];
  matrix: MatrixData;
}

const ALL = '__all__';
const STATUS_OPTIONS: { value: CellStatus; label: string }[] = [
  { value: 'valid', label: 'Valid' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'none', label: 'Not qualified' },
];

export function RequalificationDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<CheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [department, setDepartment] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch<CheckResponse>('/api/requalification/check');
      setData(res);
      setSelected(new Set());
    } catch (err) {
      setError(true);
      toast({
        variant: 'destructive',
        title: 'Could not load requalification data',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const departments = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const op of data.matrix.operators) if (op.department) set.add(op.department);
    return Array.from(set).sort();
  }, [data]);

  const filteredMatrix = useMemo<MatrixData | null>(() => {
    if (!data) return null;
    const operators = data.matrix.operators.filter((op) => {
      if (department !== ALL && op.department !== department) return false;
      if (status !== ALL) {
        const row = data.matrix.cells[op.id] ?? {};
        const machineIds = data.matrix.machines.map((m) => m.id);
        const hasStatus = machineIds.some((mid) => {
          const cell = row[mid];
          const s: CellStatus = cell ? cell.status : 'none';
          return s === status;
        });
        if (!hasStatus) return false;
      }
      return true;
    });
    return { ...data.matrix, operators };
  }, [data, department, status]);

  const toggle = useCallback((userId: string, machineId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = cellKey(userId, machineId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllExpired = useCallback(() => {
    if (!data) return;
    setSelected(new Set(data.expired.map((r) => cellKey(r.userId, r.machineId))));
  }, [data]);

  const sendAssignments = useCallback(async () => {
    if (!data || selected.size === 0) return;
    // Group selected (userId::machineId) by machine.
    const byMachine = new Map<string, string[]>();
    for (const key of selected) {
      const [userId, machineId] = key.split('::');
      const list = byMachine.get(machineId) ?? [];
      list.push(userId);
      byMachine.set(machineId, list);
    }

    setSending(true);
    try {
      let count = 0;
      for (const [machineId, userIds] of byMachine) {
        const res = await apiFetch<{ assigned: number }>('/api/requalification/assign', {
          method: 'POST',
          body: JSON.stringify({ userIds, machineId }),
        });
        count += res.assigned;
      }
      toast({
        title: 'Retraining assigned',
        description: `${count} requalification assignment(s) sent.`,
      });
      await load();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not send assignments',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    } finally {
      setSending(false);
    }
  }, [data, selected, toast, load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">Could not load requalification data.</p>
          <Button onClick={() => void load()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ExpiryAlertBanner expired={data.expired.length} expiring={data.expiring.length} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 sm:max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Department</label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Qualification Matrix</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {selected.size > 0 && <Badge variant="destructive">{selected.size} selected</Badge>}
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllExpired}
              disabled={data.expired.length === 0}
            >
              <ListChecks className="h-4 w-4" /> Select all expired
            </Button>
            <Button size="sm" onClick={sendAssignments} disabled={selected.size === 0 || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Retraining Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <MatrixLegend />
          {filteredMatrix && (
            <RequalificationMatrix
              matrix={filteredMatrix}
              selected={selected}
              onToggle={toggle}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MatrixLegend() {
  const items: { label: string; className: string }[] = [
    { label: 'Valid', className: 'bg-pharma-success/20 text-pharma-success' },
    { label: 'Expiring', className: 'bg-pharma-warning/25 text-pharma-warning' },
    { label: 'Expired', className: 'bg-pharma-danger/20 text-pharma-danger' },
    { label: 'Not qualified', className: 'bg-muted text-muted-foreground' },
  ];
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {items.map((i) => (
        <span key={i.label} className={`rounded px-2 py-1 font-medium ${i.className}`}>
          {i.label}
        </span>
      ))}
    </div>
  );
}
