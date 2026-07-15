'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatDate } from '@/lib/utils';

export type CellStatus = 'valid' | 'expiring' | 'expired' | 'none';

export interface MatrixCell {
  status: CellStatus;
  expiryDate: string | null;
  recordId: string | null;
}

export interface MatrixOperator {
  id: string;
  name: string;
  department: string | null;
}

export interface MatrixMachine {
  id: string;
  name: string;
}

export interface MatrixData {
  operators: MatrixOperator[];
  machines: MatrixMachine[];
  cells: Record<string, Record<string, MatrixCell>>;
}

export function cellKey(userId: string, machineId: string): string {
  return `${userId}::${machineId}`;
}

const CELL_STYLE: Record<CellStatus, string> = {
  valid: 'bg-pharma-success/10 text-pharma-success',
  expiring: 'bg-pharma-warning/15 text-pharma-warning',
  expired: 'bg-pharma-danger/10 text-pharma-danger',
  none: 'bg-muted text-muted-foreground',
};

interface RequalificationMatrixProps {
  matrix: MatrixData;
  selected: Set<string>;
  onToggle: (userId: string, machineId: string) => void;
}

export function RequalificationMatrix({ matrix, selected, onToggle }: RequalificationMatrixProps) {
  if (matrix.operators.length === 0 || matrix.machines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No operators or machines to display.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 min-w-[160px] bg-card">Operator</TableHead>
            {matrix.machines.map((m) => (
              <TableHead key={m.id} className="min-w-[130px] text-center">
                {m.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.operators.map((op) => (
            <TableRow key={op.id}>
              <TableCell className="sticky left-0 z-10 bg-card">
                <div className="font-medium">{op.name}</div>
                {op.department && (
                  <div className="text-xs text-muted-foreground">{op.department}</div>
                )}
              </TableCell>
              {matrix.machines.map((m) => {
                const cell: MatrixCell = matrix.cells[op.id]?.[m.id] ?? {
                  status: 'none',
                  expiryDate: null,
                  recordId: null,
                };
                const isExpired = cell.status === 'expired';
                const key = cellKey(op.id, m.id);
                const isSelected = selected.has(key);
                return (
                  <TableCell key={m.id} className="p-1.5 text-center align-middle">
                    <div
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs',
                        CELL_STYLE[cell.status],
                        isSelected && 'ring-2 ring-pharma-danger'
                      )}
                    >
                      <span className="font-semibold capitalize">
                        {cell.status === 'none' ? '—' : cell.status}
                      </span>
                      {cell.expiryDate && cell.status !== 'none' && (
                        <span className="text-[11px] opacity-80">{formatDate(cell.expiryDate)}</span>
                      )}
                      {isExpired && (
                        <label className="mt-0.5 flex items-center gap-1 text-[11px]">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggle(op.id, m.id)}
                            aria-label={`Select ${op.name} for ${m.name} retraining`}
                          />
                          Select
                        </label>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
