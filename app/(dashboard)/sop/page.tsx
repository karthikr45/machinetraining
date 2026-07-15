'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SOPStatus } from '@prisma/client';
import { FileText, Plus, Search, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { formatDate } from '@/lib/utils';
import { SOPStatusBadge } from '@/components/sop/SOPCard';

interface SopRow {
  id: string;
  sopNumber: string;
  title: string;
  version: string;
  status: SOPStatus;
  effectiveDate: string | null;
  reviewDate: string | null;
  machine: { id: string; name: string } | null;
}

interface MachineRow {
  id: string;
  name: string;
}

const STATUSES: SOPStatus[] = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'OBSOLETE'];

export default function SOPLibraryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sops, setSops] = React.useState<SopRow[]>([]);
  const [machines, setMachines] = React.useState<MachineRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const [search, setSearch] = React.useState('');
  const [machineId, setMachineId] = React.useState('all');
  const [status, setStatus] = React.useState('all');

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const [sopRes, machineRes] = await Promise.all([
          apiFetch<{ sops: SopRow[] }>('/api/sop'),
          apiFetch<{ machines: MachineRow[] }>('/api/machines'),
        ]);
        if (!active) return;
        setSops(sopRes.sops);
        setMachines(machineRes.machines);
      } catch (err) {
        if (!active) return;
        setError(true);
        toast({ title: 'Failed to load SOPs', description: (err as Error).message, variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  const filtered = sops.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || s.title.toLowerCase().includes(q) || s.sopNumber.toLowerCase().includes(q);
    const matchesMachine = machineId === 'all' || s.machine?.id === machineId;
    const matchesStatus = status === 'all' || s.status === status;
    return matchesSearch && matchesMachine && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FileText className="h-6 w-6 text-pharma-blue" /> SOP Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Standard Operating Procedures, versions and approvals.
          </p>
        </div>
        <Button asChild>
          <Link href="/sop/new">
            <Plus className="h-4 w-4" /> Upload New SOP
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by SOP number or title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={machineId} onValueChange={setMachineId}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All machines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All machines</SelectItem>
            {machines.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Could not load SOPs. Please refresh the page.
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No SOPs found</p>
              <p className="text-sm text-muted-foreground">
                {sops.length === 0
                  ? 'Upload your first Standard Operating Procedure to get started.'
                  : 'No SOPs match the current filters.'}
              </p>
              <Button asChild className="mt-1">
                <Link href="/sop/new">
                  <Plus className="h-4 w-4" /> Upload New SOP
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SOP Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Review Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/sop/${s.id}`)}
                    >
                      <TableCell className="font-medium">{s.sopNumber}</TableCell>
                      <TableCell className="max-w-[16rem] truncate">{s.title}</TableCell>
                      <TableCell>{s.machine?.name ?? '—'}</TableCell>
                      <TableCell>v{s.version}</TableCell>
                      <TableCell>
                        <SOPStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell>{formatDate(s.effectiveDate)}</TableCell>
                      <TableCell>{formatDate(s.reviewDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
