'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Plus, Inbox, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface OjtRow {
  id: string;
  overallResult: string;
  conductedAt: string;
  locked: boolean;
  trainerSignature: string | null;
  traineeSignature: string | null;
  trainee: { id: string; name: string };
  trainer: { id: string; name: string };
  machine: { id: string; name: string };
}

interface MachineRow {
  id: string;
  name: string;
}

function ResultBadge({ result }: { result: string }) {
  if (result === 'PASS') return <Badge variant="success">Pass</Badge>;
  if (result === 'FAIL') return <Badge variant="destructive">Fail</Badge>;
  return <Badge variant="gray">Pending</Badge>;
}

function SignedStatus({ row }: { row: OjtRow }) {
  if (row.locked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-pharma-success">
        <Lock className="h-4 w-4" /> Locked
      </span>
    );
  }
  const count = (row.trainerSignature ? 1 : 0) + (row.traineeSignature ? 1 : 0);
  return <span className="text-sm text-muted-foreground">{count}/2 signed</span>;
}

export default function OJTListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [records, setRecords] = React.useState<OjtRow[]>([]);
  const [machines, setMachines] = React.useState<MachineRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [machineId, setMachineId] = React.useState('all');
  const [result, setResult] = React.useState('all');

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const [ojtRes, machineRes] = await Promise.all([
          apiFetch<{ records: OjtRow[] }>('/api/ojt'),
          apiFetch<{ machines: MachineRow[] }>('/api/machines'),
        ]);
        if (!active) return;
        setRecords(ojtRes.records);
        setMachines(machineRes.machines);
      } catch (err) {
        if (!active) return;
        setError(true);
        toast({ title: 'Failed to load OJT records', description: (err as Error).message, variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  const filtered = records.filter((r) => {
    const matchesMachine = machineId === 'all' || r.machine.id === machineId;
    const matchesResult = result === 'all' || r.overallResult === result;
    return matchesMachine && matchesResult;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardCheck className="h-6 w-6 text-pharma-blue" /> On-the-Job Training
          </h1>
          <p className="text-sm text-muted-foreground">
            OJT assessments with dual electronic sign-off.
          </p>
        </div>
        <Button asChild>
          <Link href="/ojt/new">
            <Plus className="h-4 w-4" /> New OJT Session
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
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
        <Select value={result} onValueChange={setResult}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            <SelectItem value="PASS">Pass</SelectItem>
            <SelectItem value="FAIL">Fail</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
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
              Could not load OJT records. Please refresh the page.
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No OJT records found</p>
              <p className="text-sm text-muted-foreground">
                {records.length === 0
                  ? 'Start a new on-the-job training session to record a practical assessment.'
                  : 'No records match the current filters.'}
              </p>
              <Button asChild className="mt-1">
                <Link href="/ojt/new">
                  <Plus className="h-4 w-4" /> New OJT Session
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainee</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Signed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/ojt/${r.id}`)}
                    >
                      <TableCell className="font-medium">{r.trainee.name}</TableCell>
                      <TableCell>{r.machine.name}</TableCell>
                      <TableCell>{r.trainer.name}</TableCell>
                      <TableCell>{formatDate(r.conductedAt)}</TableCell>
                      <TableCell>
                        <ResultBadge result={r.overallResult} />
                      </TableCell>
                      <TableCell>
                        <SignedStatus row={r} />
                      </TableCell>
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
