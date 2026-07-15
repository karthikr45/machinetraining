import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export interface LogActionInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  changeReason?: string | null;
  ipAddress?: string | null;
  // Optional typed links for immutable trail
  trainingRecordId?: string | null;
  ojtRecordId?: string | null;
  capaId?: string | null;
  sopDocumentId?: string | null;
  simulationRecordId?: string | null;
}

/**
 * Write an immutable audit-trail entry. Every material data change should
 * pass through here. Records are never updated or deleted (ALCOA+ Enduring).
 */
export async function logAction(input: LogActionInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      changeReason: input.changeReason ?? undefined,
      ipAddress: input.ipAddress ?? undefined,
      trainingRecordId: input.trainingRecordId ?? undefined,
      ojtRecordId: input.ojtRecordId ?? undefined,
      capaId: input.capaId ?? undefined,
      sopDocumentId: input.sopDocumentId ?? undefined,
      simulationRecordId: input.simulationRecordId ?? undefined,
    },
  });
}

export interface AuditFilter {
  companyId?: string;
  userId?: string;
  entityType?: string;
  action?: string;
  from?: Date;
  to?: Date;
  take?: number;
  skip?: number;
}

export async function getAuditTrail(filter: AuditFilter) {
  const where: Prisma.AuditLogWhereInput = {};
  if (filter.userId) where.userId = filter.userId;
  if (filter.entityType) where.entityType = filter.entityType;
  if (filter.action) where.action = filter.action;
  if (filter.from || filter.to) {
    where.timestamp = {};
    if (filter.from) where.timestamp.gte = filter.from;
    if (filter.to) where.timestamp.lte = filter.to;
  }
  // Scope to company via the acting user
  if (filter.companyId) {
    where.user = { companyId: filter.companyId };
  }

  return prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: { timestamp: 'desc' },
    take: filter.take ?? 200,
    skip: filter.skip ?? 0,
  });
}

/** Get full history for a specific record (immutable trail). */
export async function getRecordHistory(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: { timestamp: 'asc' },
  });
}
