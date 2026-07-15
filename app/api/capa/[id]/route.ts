import { prisma } from '@/lib/prisma';
import { requireUser, requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES, isManager } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

/** GET /api/capa/[id] — full CAPA detail with owner, machine, audit trail and linked training records. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser();

    const capa = await prisma.cAPA.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        machine: { select: { id: true, name: true } },
        auditLogs: {
          include: { user: { select: { name: true, role: true } } },
          orderBy: { timestamp: 'asc' },
        },
        trainingRecords: {
          include: {
            user: { select: { id: true, name: true } },
            machine: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!capa) throw new ApiError('CAPA not found', 404);
    return { capa, canManage: isManager(user.role) };
  });
}

interface UpdateCAPABody {
  rootCause?: string | null;
  immediateAction?: string | null;
  preventiveAction?: string | null;
  effectivenessCheck?: string | null;
  ownerId?: string;
  dueDate?: string;
}

/** PUT /api/capa/[id] — update CAPA investigation fields (managers only). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);
    const body = (await req.json().catch(() => null)) as UpdateCAPABody | null;
    if (!body) throw new ApiError('Invalid request body', 400);

    const existing = await prisma.cAPA.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });
    if (!existing) throw new ApiError('CAPA not found', 404);

    const data: {
      rootCause?: string | null;
      immediateAction?: string | null;
      preventiveAction?: string | null;
      effectivenessCheck?: string | null;
      ownerId?: string;
      dueDate?: Date;
    } = {};
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (body.rootCause !== undefined) {
      data.rootCause = body.rootCause?.trim() || null;
      oldValue.rootCause = existing.rootCause;
      newValue.rootCause = data.rootCause;
    }
    if (body.immediateAction !== undefined) {
      data.immediateAction = body.immediateAction?.trim() || null;
      oldValue.immediateAction = existing.immediateAction;
      newValue.immediateAction = data.immediateAction;
    }
    if (body.preventiveAction !== undefined) {
      data.preventiveAction = body.preventiveAction?.trim() || null;
      oldValue.preventiveAction = existing.preventiveAction;
      newValue.preventiveAction = data.preventiveAction;
    }
    if (body.effectivenessCheck !== undefined) {
      data.effectivenessCheck = body.effectivenessCheck?.trim() || null;
      oldValue.effectivenessCheck = existing.effectivenessCheck;
      newValue.effectivenessCheck = data.effectivenessCheck;
    }
    if (body.ownerId !== undefined && body.ownerId !== existing.ownerId) {
      const owner = await prisma.user.findFirst({
        where: { id: body.ownerId, companyId: user.companyId },
        select: { id: true },
      });
      if (!owner) throw new ApiError('Owner not found in your company', 422);
      data.ownerId = owner.id;
      oldValue.ownerId = existing.ownerId;
      newValue.ownerId = owner.id;
    }
    if (body.dueDate !== undefined) {
      const due = new Date(body.dueDate);
      if (Number.isNaN(due.getTime())) throw new ApiError('Invalid due date', 422);
      data.dueDate = due;
      oldValue.dueDate = existing.dueDate.toISOString();
      newValue.dueDate = due.toISOString();
    }

    if (Object.keys(data).length === 0) {
      throw new ApiError('No changes provided', 422);
    }

    const capa = await prisma.cAPA.update({ where: { id: existing.id }, data });

    await logAction({
      userId: user.id,
      action: 'UPDATE',
      entityType: 'CAPA',
      entityId: capa.id,
      oldValue,
      newValue,
      changeReason: 'CAPA investigation updated',
      ipAddress: getClientIp(req.headers),
      capaId: capa.id,
    });

    return { capa };
  });
}
