import { handle, requireUser } from '@/lib/api-helpers';
import { loadSimConfigDTO } from '@/lib/simulation-config-loader';

/**
 * GET /api/simulation/config/[machineId]
 * Returns the effective simulation configuration for a machine (company-scoped).
 * Synthesizes a default config from library defaults when none is persisted.
 */
export async function GET(
  _req: Request,
  { params }: { params: { machineId: string } }
) {
  return handle(async () => {
    const user = await requireUser();
    const config = await loadSimConfigDTO(params.machineId, user.companyId);
    return { config };
  });
}
