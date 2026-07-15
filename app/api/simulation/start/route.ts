import { prisma } from '@/lib/prisma';
import { handle, requireUser, ApiError } from '@/lib/api-helpers';
import { loadSimConfigDTO } from '@/lib/simulation-config-loader';
import { generateBatchNumber } from '@/lib/utils';
import type { SimStartResponse } from '@/lib/simulation-shared';

interface StartBody {
  machineId?: string;
}

/**
 * POST /api/simulation/start
 * Body: { machineId }
 * Issues a fresh batch number (per-day sequence), the machine's simulation
 * config, and an authoritative server startedAt timestamp.
 */
export async function POST(req: Request) {
  return handle(async (): Promise<SimStartResponse> => {
    const user = await requireUser();
    const body = (await req.json()) as StartBody;
    const machineId = body.machineId?.trim();
    if (!machineId) throw new ApiError('machineId is required', 422);

    // Validates machine ownership (company scope) and returns the config.
    const config = await loadSimConfigDTO(machineId, user.companyId);

    // Per-day sequence: number of simulation records already completed today.
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = await prisma.simulationRecord.count({
      where: {
        completedAt: { gte: startOfDay },
        user: { companyId: user.companyId },
      },
    });

    const batchNumber = generateBatchNumber(todayCount + 1);

    return {
      batchNumber,
      startedAt: now.toISOString(),
      config,
    };
  });
}
