import { prisma } from './prisma';
import { addMonths, addDays, daysUntil } from './utils';
import { logAction } from './audit-logger';
import { sendExpiryWarning, sendRequalificationDue, sendDailySummary } from './email-service';
import { checkAndCreateCAPA } from './capa-engine';
import { flagOverdueCAPAs, getOverdueCAPAs } from './capa-engine';

export interface ExpiryReport {
  expired: number;
  expiringSoon: number;
  expiringUrgent: number;
  capasCreated: number;
  emailsSent: number;
}

/**
 * Daily expiry check across all companies:
 * 1. mark past-due records EXPIRED
 * 2. warn 30-day and 7-day expiries
 * 3. notify supervisors of same-day expiries
 * 4. create CAPA for training expired > 30 days
 * 5. daily summary to Training Managers
 */
export async function runDailyExpiryCheck(): Promise<ExpiryReport> {
  const now = new Date();
  const report: ExpiryReport = {
    expired: 0,
    expiringSoon: 0,
    expiringUrgent: 0,
    capasCreated: 0,
    emailsSent: 0,
  };

  // 1. Mark expired
  const nowExpired = await prisma.trainingRecord.findMany({
    where: { status: 'COMPLETED', expiresAt: { lt: now } },
    include: { user: true, machine: true },
  });
  for (const rec of nowExpired) {
    await prisma.trainingRecord.update({
      where: { id: rec.id },
      data: { status: 'EXPIRED' },
    });
    await logAction({
      userId: rec.userId,
      action: 'EXPIRE',
      entityType: 'TrainingRecord',
      entityId: rec.id,
      oldValue: { status: 'COMPLETED' },
      newValue: { status: 'EXPIRED' },
      changeReason: 'Certification expiry reached',
      trainingRecordId: rec.id,
    });
    await sendExpiryWarning(rec.user, rec.machine, 0);
    report.expired++;
    report.emailsSent++;

    // 4. CAPA if expired > 30 days
    if (rec.expiresAt && daysUntil(rec.expiresAt)! < -30) {
      const capa = await checkAndCreateCAPA({
        trigger: 'CERT_EXPIRED_30_DAYS',
        userId: rec.userId,
        companyId: rec.user.companyId,
        machineId: rec.machineId,
        details: { trainingRecordId: rec.id },
      });
      if (capa) report.capasCreated++;
    }
  }

  // 2. Warn expiring soon (30 & 7 days)
  const soon = await prisma.trainingRecord.findMany({
    where: {
      status: 'COMPLETED',
      expiresAt: { gte: now, lte: addDays(now, 30) },
    },
    include: { user: true, machine: true },
  });
  for (const rec of soon) {
    const d = daysUntil(rec.expiresAt)!;
    if (d <= 7) {
      await sendExpiryWarning(rec.user, rec.machine, d);
      report.expiringUrgent++;
      report.emailsSent++;
    } else {
      await sendExpiryWarning(rec.user, rec.machine, d);
      report.expiringSoon++;
      report.emailsSent++;
    }
  }

  // CAPA overdue flags
  await flagOverdueCAPAs();

  // 5. Daily summary to managers
  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const c of companies) {
    const managers = await prisma.user.findMany({
      where: { companyId: c.id, role: { in: ['TRAINING_MANAGER', 'ADMIN', 'QA_OFFICER'] } },
    });
    const expiredCount = await prisma.trainingRecord.count({
      where: { status: 'EXPIRED', user: { companyId: c.id } },
    });
    const expiringCount = await prisma.trainingRecord.count({
      where: { status: 'COMPLETED', expiresAt: { gte: now, lte: addDays(now, 30) }, user: { companyId: c.id } },
    });
    const overdue = await getOverdueCAPAs(c.id);
    for (const m of managers) {
      await sendDailySummary(m, {
        expired: expiredCount,
        expiring: expiringCount,
        overdueCapas: overdue.length,
      });
      report.emailsSent++;
    }
  }

  return report;
}

/** Assign (or reset) a requalification training record for a user+machine. */
export async function assignRequalification(userId: string, machineId: string) {
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!machine || !user) throw new Error('User or machine not found');

  const existing = await prisma.trainingRecord.findFirst({
    where: { userId, machineId, moduleId: null },
  });

  const data = {
    status: 'NOT_STARTED' as const,
    isRequalification: true,
    score: null,
    attempts: 0,
    startedAt: null,
    completedAt: null,
    expiresAt: null,
    signature: null,
    signedAt: null,
    signedBy: null,
  };

  const record = existing
    ? await prisma.trainingRecord.update({ where: { id: existing.id }, data })
    : await prisma.trainingRecord.create({
        data: { userId, machineId, ...data },
      });

  await logAction({
    userId,
    action: 'ASSIGN_REQUALIFICATION',
    entityType: 'TrainingRecord',
    entityId: record.id,
    newValue: { isRequalification: true, machine: machine.name },
    changeReason: 'Requalification assigned',
    trainingRecordId: record.id,
  });

  await sendRequalificationDue(user, machine);
  return record;
}

/** Compute an expiry report for a company (for the requalification dashboard). */
export async function getExpiryReport(companyId: string) {
  const now = new Date();
  const records = await prisma.trainingRecord.findMany({
    where: { user: { companyId }, moduleId: null },
    include: { user: { select: { id: true, name: true, department: true } }, machine: { select: { id: true, name: true } } },
  });

  const expired = records.filter((r) => r.status === 'EXPIRED' || (r.expiresAt && r.expiresAt < now));
  const expiring = records.filter(
    (r) => r.expiresAt && r.expiresAt >= now && r.expiresAt <= addDays(now, 30)
  );
  return { total: records.length, expired, expiring, records };
}

/** Set expiry date on completion based on machine requalifyMonths. */
export function computeExpiryDate(requalifyMonths: number, from = new Date()): Date {
  return addMonths(from, requalifyMonths);
}
