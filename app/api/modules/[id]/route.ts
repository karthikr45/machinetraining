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

/** GET /api/modules/[id] — one module with its quiz (company scoped). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser();
    const module = await prisma.trainingModule.findFirst({
      where: { id: params.id, machine: { companyId: user.companyId } },
      include: {
        quiz: true,
        machine: { select: { id: true, name: true, type: true } },
      },
    });
    if (!module) throw new ApiError('Module not found', 404);
    return { module };
  });
}

interface UpdateModuleBody {
  title?: string;
  titleHi?: string | null;
  content?: ModuleContent;
  moduleType?: string;
  order?: number | string;
  estimatedMinutes?: number | string;
  sopVersion?: string | null;
  quiz?: QuizQuestion[];
}

/** PUT /api/modules/[id] — update a module (managers only, audited). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);
    const existing = await prisma.trainingModule.findFirst({
      where: { id: params.id, machine: { companyId: user.companyId } },
      include: { quiz: true },
    });
    if (!existing) throw new ApiError('Module not found', 404);

    const body = (await req.json()) as UpdateModuleBody;

    const data: {
      title?: string;
      titleHi?: string | null;
      content?: Prisma.InputJsonValue;
      moduleType?: ModuleType;
      order?: number;
      estimatedMinutes?: number;
      sopVersion?: string | null;
    } = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) throw new ApiError('Module title cannot be empty', 422);
      data.title = title;
    }
    if (body.titleHi !== undefined) data.titleHi = body.titleHi?.trim() || null;
    if (body.content !== undefined) {
      if (typeof body.content !== 'object' || body.content === null) {
        throw new ApiError('Invalid module content', 422);
      }
      data.content = body.content as unknown as Prisma.InputJsonValue;
    }
    if (body.moduleType !== undefined) {
      if (!MODULE_TYPES.includes(body.moduleType as ModuleType)) {
        throw new ApiError('Invalid moduleType', 422);
      }
      data.moduleType = body.moduleType as ModuleType;
    }
    if (body.order !== undefined) {
      const n = Number(body.order);
      if (Number.isFinite(n)) data.order = Math.trunc(n);
    }
    if (body.estimatedMinutes !== undefined) {
      const n = Number(body.estimatedMinutes);
      if (Number.isFinite(n) && n > 0) data.estimatedMinutes = Math.trunc(n);
    }
    if (body.sopVersion !== undefined) data.sopVersion = body.sopVersion?.trim() || null;

    const module = await prisma.trainingModule.update({
      where: { id: existing.id },
      data,
      include: { quiz: true },
    });

    // Optionally replace quiz questions when provided.
    if (body.quiz !== undefined && Array.isArray(body.quiz)) {
      const questions = body.quiz as unknown as Prisma.InputJsonValue;
      if (existing.quiz) {
        await prisma.quiz.update({ where: { id: existing.quiz.id }, data: { questions } });
      } else if (body.quiz.length > 0) {
        await prisma.quiz.create({ data: { moduleId: existing.id, questions } });
      }
    }

    await logAction({
      userId: user.id,
      action: 'MODULE_UPDATED',
      entityType: 'TrainingModule',
      entityId: module.id,
      oldValue: {
        title: existing.title,
        moduleType: existing.moduleType,
        order: existing.order,
        estimatedMinutes: existing.estimatedMinutes,
      },
      newValue: {
        title: module.title,
        moduleType: module.moduleType,
        order: module.order,
        estimatedMinutes: module.estimatedMinutes,
      },
      ipAddress: getClientIp(req.headers),
    });

    const updated = await prisma.trainingModule.findUnique({
      where: { id: module.id },
      include: { quiz: true },
    });

    return { module: updated };
  });
}
