import type { Industry, MachineStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

export const dynamic = "force-dynamic";

const MACHINE_STATUSES: MachineStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const INDUSTRIES: Industry[] = ['PHARMA', 'FOOD_BEVERAGE', 'AUTOMOTIVE', 'OTHER'];

async function loadOwnedMachine(id: string, companyId: string) {
  const machine = await prisma.machine.findFirst({ where: { id, companyId } });
  if (!machine) throw new ApiError('Machine not found', 404);
  return machine;
}

/** GET /api/machines/[id] — one machine with modules, documents, sim config, SOPs. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser();
    const machine = await prisma.machine.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { quiz: { select: { id: true, passingScore: true, maxAttempts: true } } },
        },
        documents: { orderBy: { createdAt: 'desc' } },
        simulationConfig: true,
        sopDocuments: { orderBy: { createdAt: 'desc' } },
        _count: { select: { modules: true, documents: true } },
      },
    });
    if (!machine) throw new ApiError('Machine not found', 404);
    return { machine };
  });
}

interface UpdateMachineBody {
  name?: string;
  type?: string;
  industry?: string;
  manufacturer?: string | null;
  modelNumber?: string | null;
  yearOfMfg?: number | string | null;
  location?: string | null;
  description?: string | null;
  requalifyMonths?: number | string;
  status?: string;
}

/** PUT /api/machines/[id] — update (managers only, audited). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);
    const existing = await loadOwnedMachine(params.id, user.companyId);
    const body = (await req.json()) as UpdateMachineBody;

    const data: {
      name?: string;
      type?: string;
      industry?: Industry;
      manufacturer?: string | null;
      modelNumber?: string | null;
      yearOfMfg?: number | null;
      location?: string | null;
      description?: string | null;
      requalifyMonths?: number;
      status?: MachineStatus;
    } = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new ApiError('Machine name cannot be empty', 422);
      data.name = name;
    }
    if (body.type !== undefined) {
      const type = body.type.trim();
      if (!type) throw new ApiError('Machine type cannot be empty', 422);
      data.type = type;
    }
    if (body.industry !== undefined && INDUSTRIES.includes(body.industry as Industry)) {
      data.industry = body.industry as Industry;
    }
    if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer?.trim() || null;
    if (body.modelNumber !== undefined) data.modelNumber = body.modelNumber?.trim() || null;
    if (body.location !== undefined) data.location = body.location?.trim() || null;
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.yearOfMfg !== undefined) {
      const n = body.yearOfMfg === null || body.yearOfMfg === '' ? null : Number(body.yearOfMfg);
      data.yearOfMfg = n !== null && Number.isFinite(n) ? Math.trunc(n) : null;
    }
    if (body.requalifyMonths !== undefined) {
      const n = Number(body.requalifyMonths);
      if (Number.isFinite(n) && n > 0) data.requalifyMonths = Math.trunc(n);
    }
    if (body.status !== undefined && MACHINE_STATUSES.includes(body.status as MachineStatus)) {
      data.status = body.status as MachineStatus;
    }

    const machine = await prisma.machine.update({ where: { id: existing.id }, data });

    await logAction({
      userId: user.id,
      action: 'MACHINE_UPDATED',
      entityType: 'Machine',
      entityId: machine.id,
      oldValue: {
        name: existing.name,
        type: existing.type,
        status: existing.status,
        requalifyMonths: existing.requalifyMonths,
        manufacturer: existing.manufacturer,
        modelNumber: existing.modelNumber,
        location: existing.location,
      },
      newValue: {
        name: machine.name,
        type: machine.type,
        status: machine.status,
        requalifyMonths: machine.requalifyMonths,
        manufacturer: machine.manufacturer,
        modelNumber: machine.modelNumber,
        location: machine.location,
      },
      ipAddress: getClientIp(req.headers),
    });

    return { machine };
  });
}

/** DELETE /api/machines/[id] — ADMIN/SUPER_ADMIN only; DRAFT machines only. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireRole(['ADMIN', 'SUPER_ADMIN']);
    const existing = await loadOwnedMachine(params.id, user.companyId);

    if (existing.status !== 'DRAFT') {
      throw new ApiError('Only DRAFT machines can be deleted', 409);
    }

    // Remove dependent rows a DRAFT machine may own before deleting it.
    await prisma.$transaction([
      prisma.quiz.deleteMany({ where: { module: { machineId: existing.id } } }),
      prisma.trainingModule.deleteMany({ where: { machineId: existing.id } }),
      prisma.document.deleteMany({ where: { machineId: existing.id } }),
      prisma.simulationConfig.deleteMany({ where: { machineId: existing.id } }),
      prisma.sOPDocument.updateMany({ where: { machineId: existing.id }, data: { machineId: null } }),
      prisma.machine.delete({ where: { id: existing.id } }),
    ]);

    await logAction({
      userId: user.id,
      action: 'MACHINE_DELETED',
      entityType: 'Machine',
      entityId: existing.id,
      oldValue: { name: existing.name, type: existing.type, status: existing.status },
      ipAddress: getClientIp(req.headers),
    });

    return { success: true };
  });
}
