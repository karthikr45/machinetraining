import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole, handle } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { getExpiryReport } from '@/lib/expiry-checker';
import { addDays } from '@/lib/utils';

export const dynamic = "force-dynamic";

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

export interface RequalRecordDTO {
  recordId: string;
  userId: string;
  userName: string;
  department: string | null;
  machineId: string;
  machineName: string;
  expiryDate: string | null;
}

export interface RequalificationCheckResponse {
  total: number;
  expired: RequalRecordDTO[];
  expiring: RequalRecordDTO[];
  matrix: {
    operators: MatrixOperator[];
    machines: MatrixMachine[];
    cells: Record<string, Record<string, MatrixCell>>;
  };
}

/** Roles considered machine operators for the requalification matrix. */
const OPERATOR_ROLES: Role[] = ['OPERATOR', 'TECHNICIAN'];

/** GET /api/requalification/check — expiry report + operator×machine matrix (managers only). */
export async function GET() {
  return handle(async (): Promise<RequalificationCheckResponse> => {
    const manager = await requireRole(MANAGER_ROLES);
    const companyId = manager.companyId;
    const now = new Date();
    const soonThreshold = addDays(now, 30);

    const [report, operators, machines] = await Promise.all([
      getExpiryReport(companyId),
      prisma.user.findMany({
        where: { companyId, role: { in: OPERATOR_ROLES } },
        select: { id: true, name: true, department: true },
        orderBy: [{ department: 'asc' }, { name: 'asc' }],
      }),
      prisma.machine.findMany({
        where: { companyId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const cellStatus = (
      status: string,
      expiresAt: Date | null
    ): CellStatus => {
      if (status === 'EXPIRED') return 'expired';
      if (!expiresAt) return status === 'COMPLETED' ? 'valid' : 'none';
      if (expiresAt < now) return 'expired';
      if (expiresAt <= soonThreshold) return 'expiring';
      return 'valid';
    };

    const cells: Record<string, Record<string, MatrixCell>> = {};
    for (const op of operators) cells[op.id] = {};

    for (const rec of report.records) {
      const userCells = cells[rec.user.id];
      if (!userCells) continue; // record belongs to a non-operator role
      userCells[rec.machineId] = {
        status: cellStatus(rec.status, rec.expiresAt),
        expiryDate: rec.expiresAt ? rec.expiresAt.toISOString() : null,
        recordId: rec.id,
      };
    }

    const toDTO = (
      rec: (typeof report.records)[number]
    ): RequalRecordDTO => ({
      recordId: rec.id,
      userId: rec.user.id,
      userName: rec.user.name,
      department: rec.user.department,
      machineId: rec.machineId,
      machineName: rec.machine.name,
      expiryDate: rec.expiresAt ? rec.expiresAt.toISOString() : null,
    });

    return {
      total: report.total,
      expired: report.expired.map(toDTO),
      expiring: report.expiring.map(toDTO),
      matrix: {
        operators: operators.map((o) => ({
          id: o.id,
          name: o.name,
          department: o.department,
        })),
        machines: machines.map((m) => ({ id: m.id, name: m.name })),
        cells,
      },
    };
  });
}
