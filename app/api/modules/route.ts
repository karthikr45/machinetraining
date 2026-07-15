import type { ModuleType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';
import type { ModuleContent, QuizQuestion } from '@/lib/types';

const MODULE_TYPES: ModuleType[] = [
  'OVERVIEW',
  'OPERATION',
  'SAFETY',
  'MAINTENANCE',
  'COMPLIANCE',
  'CLEANROOM',
  'OJT',
];

/** GET /api/modules?machineId= — modules for a machine (company scoped). */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId');
    if (!machineId) throw new ApiError('machineId is required', 422);

    const machine = await prisma.machine.findFirst({
      where: { id: machineId, companyId: user.companyId },
      select: { id: true },
    });
    if (!machine) throw new ApiError('Machine not found', 404);

    const modules = await prisma.trainingModule.findMany({
      where: { machineId: machine.id },
      orderBy: { order: 'asc' },
      include: { quiz: { select: { id: true, passingScore: true, maxAttempts: true } } },
    });

    return { modules };
  });
}

interface CreateModuleBody {
  machineId?: string;
  title?: string;
  titleHi?: string | null;
  content?: ModuleContent;
  moduleType?: string;
  order?: number | string;
  estimatedMinutes?: number | string;
  sopVersion?: string | null;
  quiz?: QuizQuestion[];
}

/** POST /api/modules — create a module (managers only). */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);
    const body = (await req.json()) as CreateModuleBody;

    const machineId = body.machineId;
    const title = body.title?.trim();
    if (!machineId) throw new ApiError('machineId is required', 422);
    if (!title) throw new ApiError('Module title is required', 422);
    if (!body.content || typeof body.content !== 'object') {
      throw new ApiError('Module content is required', 422);
    }
    if (!MODULE_TYPES.includes(body.moduleType as ModuleType)) {
      throw new ApiError('A valid moduleType is required', 422);
    }

    const machine = await prisma.machine.findFirst({
      where: { id: machineId, companyId: user.companyId },
      select: { id: true },
    });
    if (!machine) throw new ApiError('Machine not found', 404);

    const orderRaw = Number(body.order);
    let order = Number.isFinite(orderRaw) ? Math.trunc(orderRaw) : NaN;
    if (!Number.isFinite(order)) {
      const last = await prisma.trainingModule.findFirst({
        where: { machineId: machine.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (last?.order ?? 0) + 1;
    }

    const minutesRaw = Number(body.estimatedMinutes);
    const estimatedMinutes = Number.isFinite(minutesRaw) && minutesRaw > 0 ? Math.trunc(minutesRaw) : 15;

    const quiz = Array.isArray(body.quiz) ? body.quiz : [];

    const module = await prisma.trainingModule.create({
      data: {
        machineId: machine.id,
        title,
        titleHi: body.titleHi?.trim() || null,
        content: body.content as unknown as Prisma.InputJsonValue,
        moduleType: body.moduleType as ModuleType,
        order,
        estimatedMinutes,
        sopVersion: body.sopVersion?.trim() || null,
        ...(quiz.length > 0
          ? { quiz: { create: { questions: quiz as unknown as Prisma.InputJsonValue } } }
          : {}),
      },
      include: { quiz: true },
    });

    await logAction({
      userId: user.id,
      action: 'MODULE_CREATED',
      entityType: 'TrainingModule',
      entityId: module.id,
      newValue: { title: module.title, moduleType: module.moduleType, machineId: machine.id },
      ipAddress: getClientIp(req.headers),
    });

    return { module };
  });
}
