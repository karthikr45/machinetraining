import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, handle, ApiError } from '@/lib/api-helpers';
import { isManager } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';
import { OJT_CHECKLIST_TEMPLATE, type OJTChecklistItem } from '@/lib/types';

const RESULTS = ['PASS', 'FAIL', 'PENDING'] as const;
type OverallResult = (typeof RESULTS)[number];

function normaliseResult(value: unknown): 'PASS' | 'FAIL' | 'PENDING' {
  return value === 'PASS' || value === 'FAIL' ? value : 'PENDING';
}

/** Build a sanitised checklist from client input or the standard template. */
export function buildChecklist(input: unknown): OJTChecklistItem[] {
  if (Array.isArray(input) && input.length > 0) {
    const byId = new Map<number, Record<string, unknown>>();
    for (const raw of input) {
      if (raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'number') {
        byId.set((raw as { id: number }).id, raw as Record<string, unknown>);
      }
    }
    return OJT_CHECKLIST_TEMPLATE.map((tpl) => {
      const raw = byId.get(tpl.id);
      const comment = raw && typeof raw.comment === 'string' ? raw.comment : undefined;
      return {
        id: tpl.id,
        section: tpl.section,
        text: tpl.text,
        result: normaliseResult(raw?.result),
        ...(comment ? { comment } : {}),
      };
    });
  }
  return OJT_CHECKLIST_TEMPLATE.map((tpl) => ({
    id: tpl.id,
    section: tpl.section,
    text: tpl.text,
    result: 'PENDING' as const,
  }));
}

/** GET /api/ojt — list OJT records for the caller's company (role-scoped). */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId');
    const result = searchParams.get('result');

    const where: Prisma.OJTRecordWhereInput = { trainee: { companyId: user.companyId } };
    if (!isManager(user.role)) {
      where.OR = [{ trainerId: user.id }, { traineeId: user.id }];
    }
    if (machineId) where.machineId = machineId;
    if (result && RESULTS.includes(result as OverallResult)) where.overallResult = result;

    const records = await prisma.oJTRecord.findMany({
      where,
      orderBy: { conductedAt: 'desc' },
      include: {
        trainee: { select: { id: true, name: true } },
        trainer: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
      },
    });

    return { records };
  });
}

interface CreateOjtBody {
  traineeId?: string;
  trainerId?: string;
  machineId?: string;
  sopVersion?: string;
  checklist?: unknown;
  overallResult?: string;
  trainerComments?: string;
  traineeComments?: string;
}

/** POST /api/ojt — create an OJT session (managers or trainers). */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    if (!isManager(user.role) && !user.isTrainer) {
      throw new ApiError('Only trainers or managers can create OJT sessions', 403);
    }

    const body = (await req.json()) as CreateOjtBody;
    const traineeId = body.traineeId?.trim();
    const trainerId = body.trainerId?.trim();
    const machineId = body.machineId?.trim();
    const sopVersion = body.sopVersion?.trim();

    if (!traineeId) throw new ApiError('Trainee is required', 422);
    if (!trainerId) throw new ApiError('Trainer is required', 422);
    if (!machineId) throw new ApiError('Machine is required', 422);
    if (!sopVersion) throw new ApiError('SOP version is required', 422);
    if (traineeId === trainerId) throw new ApiError('Trainer and trainee must be different people', 422);

    const [trainee, trainer, machine] = await Promise.all([
      prisma.user.findFirst({ where: { id: traineeId, companyId: user.companyId }, select: { id: true } }),
      prisma.user.findFirst({ where: { id: trainerId, companyId: user.companyId }, select: { id: true, isTrainer: true } }),
      prisma.machine.findFirst({ where: { id: machineId, companyId: user.companyId }, select: { id: true } }),
    ]);
    if (!trainee) throw new ApiError('Trainee not found in your company', 422);
    if (!trainer) throw new ApiError('Trainer not found in your company', 422);
    if (!machine) throw new ApiError('Machine not found in your company', 422);

    const checklist = buildChecklist(body.checklist);
    const overallResult = normaliseResult(body.overallResult);

    const record = await prisma.oJTRecord.create({
      data: {
        traineeId,
        trainerId,
        machineId,
        sopVersion,
        checklist: checklist as unknown as Prisma.InputJsonValue,
        overallResult,
        trainerComments: body.trainerComments?.trim() || null,
        traineeComments: body.traineeComments?.trim() || null,
      },
      include: {
        trainee: { select: { id: true, name: true } },
        trainer: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
      },
    });

    await logAction({
      userId: user.id,
      action: 'OJT_CREATED',
      entityType: 'OJTRecord',
      entityId: record.id,
      newValue: { traineeId, trainerId, machineId, sopVersion, overallResult },
      changeReason: 'OJT session created',
      ojtRecordId: record.id,
      ipAddress: getClientIp(req.headers),
    });

    return { record };
  });
}
