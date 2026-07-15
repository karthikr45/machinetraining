import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, handle } from '@/lib/api-helpers';
import { isManager } from '@/lib/auth';
import { addDays } from '@/lib/utils';
import { getOverdueCAPAs } from '@/lib/capa-engine';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface MonthBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

function lastSixMonths(now: Date): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: MONTH_LABELS[start.getMonth()],
      start,
      end,
    });
  }
  return buckets;
}

/**
 * GET /api/reports/overview
 * Dashboard statistics + chart series for the caller's company.
 * Managers see company-wide data; operators see their own subset.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const companyId = user.companyId;
    const manager = isManager(user.role);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30 = addDays(now, 30);
    const months = lastSixMonths(now);
    const sixMonthsAgo = months[0].start;

    const trainingWhere: Prisma.TrainingRecordWhereInput = manager
      ? { user: { companyId } }
      : { userId: user.id };

    const simWhere: Prisma.SimulationRecordWhereInput = manager
      ? { user: { companyId } }
      : { userId: user.id };

    const capaWhere: Prisma.CAPAWhereInput = manager
      ? { companyId }
      : { companyId, trainingRecords: { some: { userId: user.id } } };

    const [
      machinesPublished,
      totalTraining,
      completedTraining,
      expiredCerts,
      expiringCerts,
      batchesSimulated,
      openCapas,
      trainedThisMonthGroups,
      capaStatusGroups,
      overdueCapasList,
      trendRecords,
      recentCompletionsRaw,
      openCapaListRaw,
      upcomingRequalRaw,
      recentSimsRaw,
      simTrendRecords,
    ] = await Promise.all([
      prisma.machine.count({ where: { companyId, status: 'PUBLISHED' } }),
      prisma.trainingRecord.count({ where: trainingWhere }),
      prisma.trainingRecord.count({ where: { ...trainingWhere, status: 'COMPLETED' } }),
      prisma.trainingRecord.count({ where: { ...trainingWhere, status: 'EXPIRED' } }),
      prisma.trainingRecord.count({
        where: { ...trainingWhere, status: 'COMPLETED', expiresAt: { gte: now, lte: in30 } },
      }),
      prisma.simulationRecord.count({ where: simWhere }),
      prisma.cAPA.count({ where: { ...capaWhere, status: { notIn: ['CLOSED'] } } }),
      prisma.trainingRecord.groupBy({
        by: ['userId'],
        where: { ...trainingWhere, status: 'COMPLETED', completedAt: { gte: startOfMonth } },
      }),
      prisma.cAPA.groupBy({ by: ['status'], where: capaWhere, _count: { _all: true } }),
      getOverdueCAPAs(companyId),
      prisma.trainingRecord.findMany({
        where: trainingWhere,
        select: {
          status: true,
          createdAt: true,
          completedAt: true,
          user: { select: { department: true } },
        },
      }),
      prisma.trainingRecord.findMany({
        where: { ...trainingWhere, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          score: true,
          completedAt: true,
          isRequalification: true,
          user: { select: { name: true, department: true } },
          machine: { select: { name: true } },
        },
      }),
      prisma.cAPA.findMany({
        where: { ...capaWhere, status: { notIn: ['CLOSED'] } },
        orderBy: { dueDate: 'asc' },
        take: 8,
        select: {
          id: true,
          capaNumber: true,
          title: true,
          severity: true,
          status: true,
          dueDate: true,
          owner: { select: { name: true } },
        },
      }),
      prisma.trainingRecord.findMany({
        where: {
          ...trainingWhere,
          moduleId: null,
          OR: [
            { status: 'COMPLETED', expiresAt: { gte: now, lte: in30 } },
            { status: 'EXPIRED' },
          ],
        },
        orderBy: { expiresAt: 'asc' },
        take: 8,
        select: {
          id: true,
          status: true,
          expiresAt: true,
          user: { select: { name: true, department: true } },
          machine: { select: { name: true } },
        },
      }),
      prisma.simulationRecord.findMany({
        where: simWhere,
        orderBy: { completedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          batchNumber: true,
          totalScore: true,
          passed: true,
          machineId: true,
          completedAt: true,
          user: { select: { name: true } },
        },
      }),
      prisma.simulationRecord.findMany({
        where: { ...simWhere, completedAt: { gte: sixMonthsAgo } },
        select: { totalScore: true, completedAt: true },
      }),
    ]);

    const complianceRate =
      totalTraining === 0 ? 0 : Math.round((completedTraining / totalTraining) * 100);

    const overdueCapas = manager
      ? overdueCapasList.length
      : await prisma.cAPA.count({
          where: { ...capaWhere, status: { notIn: ['CLOSED'] }, dueDate: { lt: now } },
        });

    // Training by department
    const deptMap = new Map<string, { department: string; completed: number; total: number }>();
    for (const r of trendRecords) {
      const department = r.user.department?.trim() || 'Unassigned';
      const entry = deptMap.get(department) ?? { department, completed: 0, total: 0 };
      entry.total += 1;
      if (r.status === 'COMPLETED') entry.completed += 1;
      deptMap.set(department, entry);
    }
    const trainingByDepartment = Array.from(deptMap.values()).sort((a, b) =>
      a.department.localeCompare(b.department)
    );

    // Compliance rate trend (cumulative completion ratio at each month end)
    const complianceTrend = months.map((m) => {
      let denom = 0;
      let num = 0;
      for (const r of trendRecords) {
        if (r.createdAt <= m.end) {
          denom += 1;
          if (r.status === 'COMPLETED' && r.completedAt && r.completedAt <= m.end) num += 1;
        }
      }
      return { month: m.label, rate: denom === 0 ? 0 : Math.round((num / denom) * 100) };
    });

    // Simulation score trend
    const simScoreTrend = months.map((m) => {
      const inMonth = simTrendRecords.filter(
        (s) => s.completedAt >= m.start && s.completedAt < m.end
      );
      const avgScore =
        inMonth.length === 0
          ? 0
          : Math.round(inMonth.reduce((sum, s) => sum + s.totalScore, 0) / inMonth.length);
      return { month: m.label, avgScore };
    });

    // CAPA breakdown
    const capaBreakdown = capaStatusGroups.map((g) => ({
      status: g.status,
      count: g._count._all,
    }));

    // Resolve machine names for recent simulations (no relation on the model)
    const simMachineIds = Array.from(new Set(recentSimsRaw.map((s) => s.machineId)));
    const simMachines =
      simMachineIds.length > 0
        ? await prisma.machine.findMany({
            where: { id: { in: simMachineIds } },
            select: { id: true, name: true },
          })
        : [];
    const machineNameById = new Map(simMachines.map((m) => [m.id, m.name]));

    const recentCompletions = recentCompletionsRaw.map((r) => ({
      id: r.id,
      user: r.user.name,
      department: r.user.department ?? null,
      machine: r.machine.name,
      score: r.score,
      isRequalification: r.isRequalification,
      completedAt: r.completedAt,
    }));

    const openCapaList = openCapaListRaw.map((c) => ({
      id: c.id,
      capaNumber: c.capaNumber,
      title: c.title,
      severity: c.severity,
      status: c.status,
      dueDate: c.dueDate,
      owner: c.owner.name,
    }));

    const upcomingRequal = upcomingRequalRaw.map((r) => ({
      id: r.id,
      user: r.user.name,
      department: r.user.department ?? null,
      machine: r.machine.name,
      status: r.status,
      expiresAt: r.expiresAt,
    }));

    const recentSims = recentSimsRaw.map((s) => ({
      id: s.id,
      user: s.user.name,
      machine: machineNameById.get(s.machineId) ?? 'Machine',
      batchNumber: s.batchNumber,
      totalScore: s.totalScore,
      passed: s.passed,
      completedAt: s.completedAt,
    }));

    return {
      scope: manager ? 'company' : 'self',
      stats: {
        machinesPublished,
        operatorsTrainedThisMonth: trainedThisMonthGroups.length,
        batchesSimulated,
        complianceRate,
        openCapas,
        expiringCerts,
        expiredCerts,
        overdueCapas,
      },
      trainingByDepartment,
      simScoreTrend,
      capaBreakdown,
      complianceTrend,
      recentCompletions,
      openCapaList,
      upcomingRequal,
      recentSims,
    };
  });
}
