import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole, handle, ApiError } from '@/lib/api-helpers';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';
import { assignRequalification } from '@/lib/expiry-checker';

export const dynamic = "force-dynamic";

const APPROVER_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER', 'QA_OFFICER'];

interface ApproveBody {
  assignRetraining?: boolean;
  comment?: string;
}

interface AffectedUser {
  id: string;
  name: string;
}

/**
 * POST /api/sop/[id]/approve — approve an SOP, obsolete prior versions, and
 * surface operators trained on the machine who need retraining. Optionally
 * assign requalification to all affected operators.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireRole(APPROVER_ROLES);
    const body = (await req.json().catch(() => ({}))) as ApproveBody;
    const assignRetraining = body.assignRetraining === true;
    const comment = body.comment?.trim();

    const sop = await prisma.sOPDocument.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: { machine: { select: { id: true, name: true } } },
    });
    if (!sop) throw new ApiError('SOP not found', 404);

    const updated = await prisma.sOPDocument.update({
      where: { id: sop.id },
      data: {
        status: 'APPROVED',
        approvedBy: user.name,
        approvedAt: new Date(),
        ...(comment ? { changeReason: comment } : {}),
      },
    });

    // Mark all other versions of the same SOP number as obsolete.
    const obsoleted = await prisma.sOPDocument.updateMany({
      where: {
        companyId: user.companyId,
        sopNumber: sop.sopNumber,
        id: { not: sop.id },
        status: { not: 'OBSOLETE' },
      },
      data: { status: 'OBSOLETE' },
    });

    // Operators with a COMPLETED training record on the linked machine.
    let affectedUsers: AffectedUser[] = [];
    if (sop.machineId) {
      const records = await prisma.trainingRecord.findMany({
        where: {
          machineId: sop.machineId,
          status: 'COMPLETED',
          user: { companyId: user.companyId },
        },
        select: { userId: true, user: { select: { id: true, name: true } } },
        distinct: ['userId'],
      });
      affectedUsers = records.map((r) => ({ id: r.user.id, name: r.user.name }));
    }

    if (assignRetraining && sop.machineId) {
      for (const u of affectedUsers) {
        await assignRequalification(u.id, sop.machineId);
      }
    }

    await logAction({
      userId: user.id,
      action: 'SOP_APPROVED',
      entityType: 'SOPDocument',
      entityId: sop.id,
      oldValue: { status: sop.status },
      newValue: {
        status: 'APPROVED',
        version: sop.version,
        approvedBy: user.name,
        versionsObsoleted: obsoleted.count,
        affectedOperators: affectedUsers.length,
        retrainingAssigned: assignRetraining,
      },
      changeReason:
        comment ||
        (assignRetraining
          ? 'SOP approved; requalification assigned to affected operators'
          : 'SOP approved'),
      sopDocumentId: sop.id,
      ipAddress: getClientIp(req.headers),
    });

    return {
      sop: updated,
      affectedCount: affectedUsers.length,
      affectedUsers,
      retrainingAssigned: assignRetraining,
    };
  });
}
