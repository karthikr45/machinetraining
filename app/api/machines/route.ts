import type { Industry, MachineStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

const MACHINE_STATUSES: MachineStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const INDUSTRIES: Industry[] = ['PHARMA', 'FOOD_BEVERAGE', 'AUTOMOTIVE', 'OTHER'];

/** GET /api/machines — list machines for the caller's company. */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');

    const where: { companyId: string; status?: MachineStatus } = {
      companyId: user.companyId,
    };
    if (statusParam && MACHINE_STATUSES.includes(statusParam as MachineStatus)) {
      where.status = statusParam as MachineStatus;
    }

    const machines = await prisma.machine.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { modules: true, documents: true } },
        simulationConfig: { select: { id: true } },
      },
    });

    return { machines };
  });
}

interface CreateMachineBody {
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

/** POST /api/machines — create a machine (managers only). */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);
    const body = (await req.json()) as CreateMachineBody;

    const name = body.name?.trim();
    const type = body.type?.trim();
    if (!name) throw new ApiError('Machine name is required', 422);
    if (!type) throw new ApiError('Machine type is required', 422);

    const industry: Industry = INDUSTRIES.includes(body.industry as Industry)
      ? (body.industry as Industry)
      : 'PHARMA';

    const status: MachineStatus = MACHINE_STATUSES.includes(body.status as MachineStatus)
      ? (body.status as MachineStatus)
      : 'DRAFT';

    const yearOfMfgRaw =
      body.yearOfMfg === null || body.yearOfMfg === undefined || body.yearOfMfg === ''
        ? null
        : Number(body.yearOfMfg);
    const yearOfMfg =
      yearOfMfgRaw !== null && Number.isFinite(yearOfMfgRaw) ? Math.trunc(yearOfMfgRaw) : null;

    const requalifyRaw = Number(body.requalifyMonths);
    const requalifyMonths = Number.isFinite(requalifyRaw) && requalifyRaw > 0 ? Math.trunc(requalifyRaw) : 12;

    const machine = await prisma.machine.create({
      data: {
        companyId: user.companyId,
        name,
        type,
        industry,
        manufacturer: body.manufacturer?.trim() || null,
        modelNumber: body.modelNumber?.trim() || null,
        yearOfMfg,
        location: body.location?.trim() || null,
        description: body.description?.trim() || null,
        requalifyMonths,
        status,
      },
    });

    await logAction({
      userId: user.id,
      action: 'MACHINE_CREATED',
      entityType: 'Machine',
      entityId: machine.id,
      newValue: {
        name: machine.name,
        type: machine.type,
        status: machine.status,
        industry: machine.industry,
      },
      ipAddress: getClientIp(req.headers),
    });

    return { machine };
  });
}
