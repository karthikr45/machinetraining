import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, handle, ApiError } from '@/lib/api-helpers';
import { isManager } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';
import { buildChecklist } from '../route';

function normaliseResult(value: unknown): 'PASS' | 'FAIL' | 'PENDING' {
  return value === 'PASS' || value === 'FAIL' ? value : 'PENDING';
}

/** GET /api/ojt/[id] — one OJT record (company-scoped, role-visible). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser();

    const record = await prisma.oJTRecord.findFirst({
      where: { id: params.id, trainee: { companyId: user.companyId } },
      include: {
        trainee: { select: { id: true, name: true, email: true } },
        trainer: { select: { id: true, name: true, email: true } },
        machine: { select: { id: true, name: true } },
      },
    });
    if (!record) throw new ApiError('OJT record not found', 404);

    const visible =
      isManager(user.role) || record.trainerId === user.id || record.traineeId === user.id;
    if (!visible) throw new ApiError('Forbidden', 403);

    return { record };
  });
}

interface UpdateOjtBody {
  checklist?: unknown;
  trainerComments?: string;
  traineeComments?: string;
  overallResult?: string;
}

/** PUT /api/ojt/[id] — update checklist / comments / result while unlocked. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser();

    const record = await prisma.oJTRecord.findFirst({
      where: { id: params.id, trainee: { companyId: user.companyId } },
    });
    if (!record) throw new ApiError('OJT record not found', 404);
    if (record.locked) throw new ApiError('Record is locked — no further edits allowed', 409);

    const mgr = isManager(user.role);
    const isTrainerOfRecord = record.trainerId === user.id;
    const isTraineeOfRecord = record.traineeId === user.id;
    const canAssess = mgr || isTrainerOfRecord;
    if (!canAssess && !isTraineeOfRecord) throw new ApiError('Forbidden', 403);

    const body = (await req.json()) as UpdateOjtBody;
    const data: Prisma.OJTRecordUpdateInput = {};

    if (body.checklist !== undefined) {
      if (!canAssess) throw new ApiError('Only the trainer or a manager can grade the checklist', 403);
      data.checklist = buildChecklist(body.checklist) as unknown as Prisma.InputJsonValue;
    }
    if (body.trainerComments !== undefined) {
      if (!canAssess) throw new ApiError('Only the trainer or a manager can set trainer comments', 403);
      data.trainerComments = body.trainerComments.trim() || null;
    }
    if (body.traineeComments !== undefined) {
      if (!canAssess && !isTraineeOfRecord) throw new ApiError('Forbidden', 403);
      data.traineeComments = body.traineeComments.trim() || null;
    }
    if (body.overallResult !== undefined) {
      if (!canAssess) throw new ApiError('Only the trainer or a manager can set the overall result', 403);
      data.overallResult = normaliseResult(body.overallResult);
    }

    if (Object.keys(data).length === 0) throw new ApiError('No changes provided', 422);

    const updated = await prisma.oJTRecord.update({
      where: { id: record.id },
      data,
      include: {
        trainee: { select: { id: true, name: true } },
        trainer: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
      },
    });

    await logAction({
      userId: user.id,
      action: 'OJT_UPDATED',
      entityType: 'OJTRecord',
      entityId: record.id,
      oldValue: { overallResult: record.overallResult },
      newValue: { overallResult: updated.overallResult, fields: Object.keys(data) },
      changeReason: 'OJT record updated',
      ojtRecordId: record.id,
      ipAddress: getClientIp(req.headers),
    });

    return { record: updated };
  });
}
