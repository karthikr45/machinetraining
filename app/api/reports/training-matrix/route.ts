import type { TrainingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole, handle } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/types';

export const dynamic = "force-dynamic";

const STATUS_RANK: Record<TrainingStatus, number> = {
  COMPLETED: 5,
  EXPIRED: 4,
  IN_PROGRESS: 3,
  FAILED: 2,
  NOT_STARTED: 1,
};

interface Cell {
  status: TrainingStatus;
  score: number | null;
  expiresAt: Date | null;
  completedAt: Date | null;
}

/**
 * GET /api/reports/training-matrix
 * Operators × machines completion matrix for the caller's company (managers only).
 */
export async function GET() {
  return handle(async () => {
    const manager = await requireRole(MANAGER_ROLES);
    const companyId = manager.companyId;

    const [machines, operators, records] = await Promise.all([
      prisma.machine.findMany({
        where: { companyId, status: { not: 'ARCHIVED' } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, status: true },
      }),
      prisma.user.findMany({
        where: { companyId, role: { in: ['OPERATOR', 'TECHNICIAN', 'TRAINER'] } },
        orderBy: [{ department: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, department: true, role: true },
      }),
      prisma.trainingRecord.findMany({
        where: { user: { companyId } },
        select: {
          userId: true,
          machineId: true,
          status: true,
          score: true,
          expiresAt: true,
          completedAt: true,
        },
      }),
    ]);

    const cellMap = new Map<string, Cell>();
    for (const r of records) {
      const key = `${r.userId}:${r.machineId}`;
      const existing = cellMap.get(key);
      const candidate: Cell = {
        status: r.status,
        score: r.score,
        expiresAt: r.expiresAt,
        completedAt: r.completedAt,
      };
      if (!existing || STATUS_RANK[candidate.status] > STATUS_RANK[existing.status]) {
        cellMap.set(key, candidate);
      }
    }

    const rows = operators.map((op) => {
      const cells = machines.map((m) => {
        const cell = cellMap.get(`${op.id}:${m.id}`);
        return {
          machineId: m.id,
          status: cell?.status ?? ('NOT_STARTED' as TrainingStatus),
          score: cell?.score ?? null,
          expiresAt: cell?.expiresAt ?? null,
        };
      });
      const completed = cells.filter((c) => c.status === 'COMPLETED').length;
      return {
        userId: op.id,
        name: op.name,
        department: op.department ?? null,
        role: ROLE_LABELS[op.role],
        cells,
        completed,
        total: machines.length,
      };
    });

    return {
      machines: machines.map((m) => ({ id: m.id, name: m.name, status: m.status })),
      operators: rows,
    };
  });
}
