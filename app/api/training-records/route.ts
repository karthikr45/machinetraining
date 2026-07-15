import { handle, requireUser, ApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { isManager } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

/**
 * GET the caller's training records, or — for managers — another user's records
 * within the same company via ?userId=. Joined with machine & module.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const requestedUserId = url.searchParams.get('userId');

    let targetUserId = user.id;
    if (requestedUserId && requestedUserId !== user.id) {
      if (!isManager(user.role)) {
        throw new ApiError('Forbidden — cannot view other users’ records', 403);
      }
      const target = await prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { id: true, companyId: true },
      });
      if (!target || target.companyId !== user.companyId) {
        throw new ApiError('User not found', 404);
      }
      targetUserId = target.id;
    }

    const records = await prisma.trainingRecord.findMany({
      where: { userId: targetUserId, machine: { companyId: user.companyId } },
      include: {
        machine: { select: { id: true, name: true, type: true, requalifyMonths: true } },
        module: { select: { id: true, title: true, moduleType: true, order: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return { records };
  });
}

interface CreateBody {
  machineId: string;
  moduleId?: string | null;
}

/**
 * POST to create/start a training record (status IN_PROGRESS, startedAt now).
 * If a record already exists it is only advanced from NOT_STARTED — a completed
 * or failed record is returned untouched so history is preserved.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as CreateBody | null;
    if (!body?.machineId) {
      throw new ApiError('machineId is required', 422);
    }

    const machine = await prisma.machine.findUnique({
      where: { id: body.machineId },
      select: { id: true, companyId: true },
    });
    if (!machine || machine.companyId !== user.companyId) {
      throw new ApiError('Machine not found', 404);
    }

    const moduleId = body.moduleId ?? null;
    if (moduleId) {
      const mod = await prisma.trainingModule.findUnique({
        where: { id: moduleId },
        select: { machineId: true },
      });
      if (!mod || mod.machineId !== machine.id) {
        throw new ApiError('Module does not belong to this machine', 404);
      }
    }

    const existing = await prisma.trainingRecord.findFirst({
      where: { userId: user.id, machineId: machine.id, moduleId },
    });

    if (existing) {
      if (existing.status === 'NOT_STARTED') {
        const updated = await prisma.trainingRecord.update({
          where: { id: existing.id },
          data: { status: 'IN_PROGRESS', startedAt: existing.startedAt ?? new Date() },
        });
        await logAction({
          userId: user.id,
          action: 'START_TRAINING',
          entityType: 'TrainingRecord',
          entityId: updated.id,
          newValue: { status: 'IN_PROGRESS', moduleId },
          changeReason: 'Training started',
          ipAddress: getClientIp(req.headers),
          trainingRecordId: updated.id,
        });
        return { record: updated };
      }
      return { record: existing };
    }

    const created = await prisma.trainingRecord.create({
      data: {
        userId: user.id,
        machineId: machine.id,
        moduleId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    await logAction({
      userId: user.id,
      action: 'START_TRAINING',
      entityType: 'TrainingRecord',
      entityId: created.id,
      newValue: { status: 'IN_PROGRESS', moduleId },
      changeReason: 'Training started',
      ipAddress: getClientIp(req.headers),
      trainingRecordId: created.id,
    });

    return { record: created };
  });
}
