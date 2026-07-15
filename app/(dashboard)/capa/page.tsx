'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, ClipboardList, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  CAPACard,
  type CAPACardData,
  type CAPAStatusValue,
  type CAPASeverityValue,
} from '@/components/capa/CAPACard';

interface CAPAListResponse {
  capas: CAPACardData[];
  canManage: boolean;
  currentUserId: string;
}

interface StatusChangeResponse {
  capa: { id: string; status: CAPAStatusValue } | null;
  effectiveness: { effective: boolean; message: string } | null;
}

const COLUMNS: { status: CAPAStatusValue; label: string }[] = [
  { status: 'OPEN', label: 'Open' },
  { status: 'INVESTIGATION', label: 'Investigation' },
  { status: 'ACTION_TAKEN', label: 'Action Taken' },
  { status: 'VERIFICATION', label: 'Verification' },
  { status: 'CLOSED', label: 'Closed' },
];

const SEVERITIES: CAPASeverityValue[] = ['MINOR', 'MAJOR', 'CRITICAL'];
const ALL = '__all__';

/** OVERDUE cards have no workflow column — surface them under Open. */
function columnFor(status: CAPAStatusValue): CAPAStatusValue {
  return status === 'OVERDUE' ? 'OPEN' : status;
}

export default function CAPABoardPage() {
  const { toast } = useToast();
  const [capas, setCapas] = useState<CAPACardData[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [severity, setSeverity] = useState<string>(ALL);
  const [machine, setMachine] = useState<string>(ALL);
  const [owner, setOwner] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch<CAPAListResponse>('/api/capa');
      setCapas(res.capas);
      setCanManage(res.canManage);
    } catch (err) {
      setError(true);
      toast({
        variant: 'destructive',
        title: 'Could not load CAPAs',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const machineOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of capas) if (c.machineId && c.machineName) map.set(c.machineId, c.machineName);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [capas]);

  const ownerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of capas) map.set(c.ownerId, c.ownerName);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [capas]);

  const filtered = useMemo(
    () =>
      capas.filter((c) => {
        if (severity !== ALL && c.severity !== severity) return false;
        if (machine !== ALL && c.machineId !== machine) return false;
        if (owner !== ALL && c.ownerId !== owner) return false;
        if (statusFilter !== ALL && c.status !== statusFilter) return false;
        return true;
      }),
    [capas, severity, machine, owner, statusFilter]
  );

  const handleStatusChange = useCallback(
    async (id: string, status: CAPAStatusValue) => {
      setBusyId(id);
      try {
        const res = await apiFetch<StatusChangeResponse>(`/api/capa/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
        const nextStatus = res.capa?.status ?? status;
        setCapas((prev) => prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)));
        toast({
          title: 'Status updated',
          description: res.effectiveness ? res.effectiveness.message : undefined,
        });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Could not update status',
          description: err instanceof Error ? err.message : 'Please retry.',
        });
      } finally {
        setBusyId(null);
      }
    },
    [toast]
  );

  const total = capas.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CAPA Management</h1>
          <p className="text-sm text-muted-foreground">
            Corrective &amp; Preventive Actions{!loading ? ` · ${total} total` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Button asChild>
              <Link href="/capa/new">
                <Plus className="h-4 w-4" /> New CAPA
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="Severity"
          value={severity}
          onChange={setSeverity}
          options={SEVERITIES.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={COLUMNS.map((c) => ({ value: c.status, label: c.label })).concat({
            value: 'OVERDUE',
            label: 'Overdue',
          })}
        />
        <FilterSelect
          label="Machine"
          value={machine}
          onChange={setMachine}
          options={machineOptions.map((m) => ({ value: m.id, label: m.name }))}
        />
        <FilterSelect
          label="Owner"
          value={owner}
          onChange={setOwner}
          options={ownerOptions.map((o) => ({ value: o.id, label: o.name }))}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => (
            <div key={col.status} className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">Something went wrong loading CAPAs.</p>
            <Button onClick={() => void load()}>Try again</Button>
          </CardContent>
        </Card>
      ) : total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No CAPAs yet</p>
              <p className="text-sm text-muted-foreground">
                CAPAs are auto-generated from training failures, or you can raise one manually.
              </p>
            </div>
            {canManage && (
              <Button asChild>
                <Link href="/capa/new">
                  <Plus className="h-4 w-4" /> New CAPA
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = filtered.filter((c) => columnFor(c.status) === col.status);
            return (
              <div key={col.status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {items.map((c) => (
                    <CAPACard
                      key={c.id}
                      capa={c}
                      canManage={canManage}
                      busy={busyId === c.id}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                      None
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label}s</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
