'use client';

import { useEffect, useState } from 'react';
import { Grid3x3, CheckCircle2, XCircle, Clock, AlertOctagon, Minus } from 'lucide-react';
import { apiFetch } from '@/lib/client';
import { cn, formatPct } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TrainingStatus = 'COMPLETED' | 'EXPIRED' | 'IN_PROGRESS' | 'FAILED' | 'NOT_STARTED';

interface MatrixCell {
  machineId: string;
  status: TrainingStatus;
  score: number | null;
  expiresAt: string | null;
}

interface MatrixOperator {
  userId: string;
  name: string;
  department: string | null;
  role: string;
  cells: MatrixCell[];
  completed: number;
  total: number;
}

interface MatrixData {
  machines: { id: string; name: string; status: string }[];
  operators: MatrixOperator[];
}

const STATUS_META: Record<TrainingStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  COMPLETED: { label: 'Completed', className: 'bg-pharma-success/15 text-pharma-success', icon: CheckCircle2 },
  EXPIRED: { label: 'Expired', className: 'bg-pharma-purple/15 text-pharma-purple', icon: AlertOctagon },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-500/15 text-blue-600', icon: Clock },
  FAILED: { label: 'Failed', className: 'bg-pharma-danger/15 text-pharma-danger', icon: XCircle },
  NOT_STARTED: { label: 'Not Started', className: 'bg-slate-200 text-slate-500', icon: Minus },
};

export function TrainingMatrix() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<MatrixData>('/api/reports/training-matrix');
        if (active) setData(res);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load matrix.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (!data || data.operators.length === 0 || data.machines.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
          <Grid3x3 className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No matrix data</p>
          <p className="text-sm text-muted-foreground">
            Add machines and operators to build the competency matrix.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(STATUS_META) as TrainingStatus[]).map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <span key={s} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('flex h-5 w-5 items-center justify-center rounded', meta.className)}>
                <Icon className="h-3 w-3" />
              </span>
              {meta.label}
            </span>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3x3 className="h-4 w-4 text-pharma-blue" />
            Operator × Machine Competency Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TooltipProvider delayDuration={100}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-card">Operator</TableHead>
                  {data.machines.map((m) => (
                    <TableHead key={m.id} className="text-center">
                      <span className="block max-w-[7rem] truncate" title={m.name}>
                        {m.name}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.operators.map((op) => (
                  <TableRow key={op.userId}>
                    <TableCell className="sticky left-0 z-10 bg-card">
                      <div className="font-medium">{op.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {op.role}
                        {op.department ? ` · ${op.department}` : ''}
                      </div>
                    </TableCell>
                    {op.cells.map((cell) => {
                      const meta = STATUS_META[cell.status];
                      const Icon = meta.icon;
                      return (
                        <TableCell key={cell.machineId} className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  'mx-auto flex h-7 w-7 items-center justify-center rounded-md',
                                  meta.className
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">{meta.label}</p>
                              {cell.score !== null && <p>Score: {formatPct(cell.score)}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center text-sm font-medium">
                      {op.completed}/{op.total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
