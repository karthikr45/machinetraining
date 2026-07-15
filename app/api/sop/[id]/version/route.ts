import { prisma } from '@/lib/prisma';
import { requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp, incrementVersion } from '@/lib/utils';

export const dynamic = "force-dynamic";

interface NewVersionBody {
  changeReason?: string;
}

/** POST /api/sop/[id]/version — create a new DRAFT version of an SOP (managers). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);
    const body = (await req.json().catch(() => ({}))) as NewVersionBody;

    const changeReason = body.changeReason?.trim();
    if (!changeReason) throw new ApiError('A change reason is required to create a new version', 422);

    const prev = await prisma.sOPDocument.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });
    if (!prev) throw new ApiError('SOP not found', 404);

    const newVersion = incrementVersion(prev.version);

    const sop = await prisma.sOPDocument.create({
      data: {
        companyId: prev.companyId,
        machineId: prev.machineId,
        title: prev.title,
        sopNumber: prev.sopNumber,
        version: newVersion,
        status: 'DRAFT',
        filePath: prev.filePath,
        extractedText: prev.extractedText,
        changeReason,
        effectiveDate: prev.effectiveDate,
        reviewDate: prev.reviewDate,
        previousVersion: prev.id,
      },
      include: { machine: { select: { id: true, name: true } } },
    });

    await logAction({
      userId: user.id,
      action: 'SOP_VERSION_CREATED',
      entityType: 'SOPDocument',
      entityId: sop.id,
      oldValue: { version: prev.version },
      newValue: { version: newVersion, previousVersion: prev.id },
      changeReason,
      sopDocumentId: sop.id,
      ipAddress: getClientIp(req.headers),
    });

    return { sop };
  });
}
