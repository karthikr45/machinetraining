import type { CAPAStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { updateCAPAStatus, checkCAPAEffectiveness } from '@/lib/capa-engine';

const STATUSES: CAPAStatus[] = [
  'OPEN',
  'INVESTIGATION',
  'ACTION_TAKEN',
  'VERIFICATION',
  'CLOSED',
  'OVERDUE',
];

interface StatusBody {
  status?: string;
  comments?: string;
}

/** PUT /api/capa/[id]/status — advance the CAPA workflow (managers only). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);
    const body = (await req.json().catch(() => null)) as StatusBody | null;
    if (!body) throw new ApiError('Invalid request body', 400);

    if (!body.status || !STATUSES.includes(body.status as CAPAStatus)) {
      throw new ApiError('A valid status is required', 422);
    }
    const status = body.status as CAPAStatus;

    const existing = await prisma.cAPA.findFirst({
      where: { id: params.id, companyId: user.companyId },
      select: { id: true },
    });
    if (!existing) throw new ApiError('CAPA not found', 404);

    await updateCAPAStatus(existing.id, status, user.id, body.comments?.trim() || undefined);

    let effectiveness: { effective: boolean; message: string } | null = null;
    if (status === 'CLOSED') {
      const effective = await checkCAPAEffectiveness(existing.id);
      effectiveness = {
        effective,
        message: effective
          ? 'Effective — linked training was completed within 30 days of closure.'
          : 'Effectiveness not yet demonstrated — CAPA reopened for follow-up.',
      };
    }

    // Return the current persisted state (checkCAPAEffectiveness may have reopened it).
    const capa = await prisma.cAPA.findUnique({ where: { id: existing.id } });

    return { capa, effectiveness };
  });
}
