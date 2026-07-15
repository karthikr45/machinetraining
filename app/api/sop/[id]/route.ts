import type { Prisma, SOPStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

const EDITABLE_STATUSES: SOPStatus[] = ['DRAFT', 'UNDER_REVIEW'];

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

/** GET /api/sop/[id] — one SOP with version history and audit trail. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser();

    const sop = await prisma.sOPDocument.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: {
        machine: { select: { id: true, name: true } },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          include: { user: { select: { name: true, role: true } } },
        },
      },
    });
    if (!sop) throw new ApiError('SOP not found', 404);

    const versionHistory = await prisma.sOPDocument.findMany({
      where: { companyId: user.companyId, sopNumber: sop.sopNumber },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        version: true,
        status: true,
        changeReason: true,
        approvedBy: true,
        approvedAt: true,
        effectiveDate: true,
        createdAt: true,
        previousVersion: true,
      },
    });

    return { sop, versionHistory };
  });
}

interface UpdateSopBody {
  title?: string;
  machineId?: string | null;
  effectiveDate?: string | null;
  reviewDate?: string | null;
  status?: string;
}

/** PUT /api/sop/[id] — update SOP metadata (managers). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);
    const body = (await req.json()) as UpdateSopBody;

    const existing = await prisma.sOPDocument.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });
    if (!existing) throw new ApiError('SOP not found', 404);
    if (existing.status === 'APPROVED' || existing.status === 'OBSOLETE') {
      throw new ApiError('Approved or obsolete SOPs cannot be edited — create a new version', 409);
    }

    const data: Prisma.SOPDocumentUpdateInput = {};
    if (body.title !== undefined) {
      const t = body.title.trim();
      if (!t) throw new ApiError('Title cannot be empty', 422);
      data.title = t;
    }
    if (body.machineId !== undefined) {
      const mid = body.machineId?.trim() || null;
      if (mid) {
        const machine = await prisma.machine.findFirst({
          where: { id: mid, companyId: user.companyId },
          select: { id: true },
        });
        if (!machine) throw new ApiError('Linked machine not found in your company', 422);
        data.machine = { connect: { id: mid } };
      } else {
        data.machine = { disconnect: true };
      }
    }
    if (body.effectiveDate !== undefined) data.effectiveDate = parseDate(body.effectiveDate);
    if (body.reviewDate !== undefined) data.reviewDate = parseDate(body.reviewDate);
    if (body.status !== undefined) {
      if (!EDITABLE_STATUSES.includes(body.status as SOPStatus)) {
        throw new ApiError('Status can only be set to DRAFT or UNDER_REVIEW here', 422);
      }
      data.status = body.status as SOPStatus;
    }

    const sop = await prisma.sOPDocument.update({
      where: { id: existing.id },
      data,
      include: { machine: { select: { id: true, name: true } } },
    });

    await logAction({
      userId: user.id,
      action: 'SOP_UPDATED',
      entityType: 'SOPDocument',
      entityId: sop.id,
      oldValue: {
        title: existing.title,
        machineId: existing.machineId,
        status: existing.status,
      },
      newValue: { title: sop.title, machineId: sop.machineId, status: sop.status },
      changeReason: 'SOP metadata updated',
      sopDocumentId: sop.id,
      ipAddress: getClientIp(req.headers),
    });

    return { sop };
  });
}
