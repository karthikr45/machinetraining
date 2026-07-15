import { prisma } from '@/lib/prisma';
import { requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { assignRequalification } from '@/lib/expiry-checker';

export const dynamic = "force-dynamic";

interface AssignBody {
  userId?: string;
  userIds?: string[];
  machineId?: string;
}

/** POST /api/requalification/assign — assign requalification to one or many operators (managers only). */
export async function POST(req: Request) {
  return handle(async () => {
    const manager = await requireRole(MANAGER_ROLES);
    const body = (await req.json().catch(() => null)) as AssignBody | null;
    if (!body) throw new ApiError('Invalid request body', 400);

    const machineId = body.machineId?.trim();
    if (!machineId) throw new ApiError('A machine is required', 422);

    const machine = await prisma.machine.findFirst({
      where: { id: machineId, companyId: manager.companyId },
      select: { id: true },
    });
    if (!machine) throw new ApiError('Machine not found in your company', 422);

    const ids = Array.from(
      new Set([...(body.userIds ?? []), ...(body.userId ? [body.userId] : [])].filter(Boolean))
    );
    if (ids.length === 0) throw new ApiError('At least one operator is required', 422);

    // Confirm every user belongs to the manager's company.
    const users = await prisma.user.findMany({
      where: { id: { in: ids }, companyId: manager.companyId },
      select: { id: true },
    });
    if (users.length !== ids.length) {
      throw new ApiError('One or more operators are not in your company', 422);
    }

    const assigned: string[] = [];
    for (const userId of ids) {
      await assignRequalification(userId, machineId);
      assigned.push(userId);
    }

    return { assigned: assigned.length, userIds: assigned, machineId };
  });
}
