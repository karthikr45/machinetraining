'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Printer, Filter, RefreshCw, FileSearch } from 'lucide-react';
import { apiFetch } from '@/lib/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuditTrail, ImmutabilityNotice, type AuditEntry } from '@/components/reports/AuditTrail';

const ENTITY_TYPES = [
  'TrainingRecord', 'CAPA', 'Machine', 'SOPDocument', 'OJTRecord', 'SimulationRecord', 'ElectronicSignature',
];
const ACTIONS = [
  'CREATE', 'UPDATE', 'STATUS_CHANGE', 'SIGN', 'LOCK', 'EXPIRE', 'ASSIGN_REQUALIFICATION', 'REOPEN',
];
const ALL = '__all__';

interface AuditResponse {
  entries: AuditEntry[];
  count: number;
}

/**
 * Filterable, immutable audit-trail viewer. Fetches /api/audit-log and
 * supports CSV export (server) and PDF export (print).
 */
export function AuditTrailViewer() {
  const { toast } = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (userId.trim()) params.set('userId', userId.trim());
    if (entityType !== ALL) params.set('entityType', entityType);
    if (action !== ALL) params.set('action', action);
    return params.toString();
  }, [from, to, userId, entityType, action]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery();
      const data = await apiFetch<AuditResponse>(`/api/audit-log${qs ? `?${qs}` : ''}`);
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFilters() {
    setFrom('');
    setTo('');
    setUserId('');
    setEntityType(ALL);
    setAction(ALL);
  }

  function exportCsv() {
    const qs = buildQuery();
    window.open(`/api/reports/audit-trail?format=csv${qs ? `&${qs}` : ''}`, '_blank');
    toast({ title: 'Export started', description: 'Your CSV download will begin shortly.' });
  }

  function exportPdf() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-pharma-blue" />
            Filters
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="af-from">From</Label>
              <Input id="af-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af-to">To</Label>
              <Input id="af-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af-user">User ID</Label>
              <Input
                id="af-user"
                placeholder="Optional user id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All entities</SelectItem>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All actions</SelectItem>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={load} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Apply
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportPdf} className="gap-2">
              <Printer className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div id="audit-print-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <ImmutabilityNotice />
          <span className="text-xs text-muted-foreground">{entries.length} record(s)</span>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center text-sm text-destructive">{error}</div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <FileSearch className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No audit entries</p>
                <p className="text-sm text-muted-foreground">
                  No records match the selected filters.
                </p>
              </div>
            ) : (
              <AuditTrail entries={entries} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
