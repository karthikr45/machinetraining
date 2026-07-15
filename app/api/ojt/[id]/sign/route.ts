import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, handle, ApiError } from '@/lib/api-helpers';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';
import { createElectronicSignature } from '@/lib/electronic-signature';
import { checkAndCreateCAPA } from '@/lib/capa-engine';
import { sendOJTCompletion } from '@/lib/email-service';

export const dynamic = "force-dynamic";

interface SignBody {
  role?: 'trainer' | 'trainee';
  password?: string;
}

/**
 * POST /api/ojt/[id]/sign — apply a 21 CFR Part 11 electronic signature.
 * The caller must BE the trainer (for role 'trainer') or trainee (role 'trainee')
 * and re-enter their own password. When both parties have signed the record locks;
 * a FAIL result triggers a CAPA and a completion email is sent to the trainee.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser();
    const body = (await req.json()) as SignBody;
    const role = body.role;
    const password = body.password;

    if (role !== 'trainer' && role !== 'trainee') throw new ApiError('Signature role must be "trainer" or "trainee"', 422);
    if (!password) throw new ApiError('Password is required to sign', 422);

    const record = await prisma.oJTRecord.findFirst({
      where: { id: params.id, trainee: { companyId: user.companyId } },
      include: {
        trainee: { select: { id: true, name: true, email: true, companyId: true } },
        trainer: { select: { id: true, name: true, email: true } },
        machine: { select: { id: true, name: true } },
      },
    });
    if (!record) throw new ApiError('OJT record not found', 404);
    if (record.locked) throw new ApiError('Record is locked — no further signatures allowed', 409);

    if (role === 'trainer') {
      if (user.id !== record.trainerId) throw new ApiError('Only the assigned trainer can apply the trainer signature', 403);
      if (record.trainerSignature) throw new ApiError('The trainer has already signed', 409);
    } else {
      if (user.id !== record.traineeId) throw new ApiError('Only the assigned trainee can apply the trainee signature', 403);
      if (record.traineeSignature) throw new ApiError('The trainee has already signed', 409);
    }

    const meaning = role === 'trainer' ? 'OJT trainer assessment sign-off' : 'OJT trainee acknowledgement';
    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || undefined;

    let signatureResult;
    try {
      signatureResult = await createElectronicSignature({
        userId: user.id,
        recordType: 'OJTRecord',
        recordId: record.id,
        meaning,
        password,
        ipAddress,
        userAgent,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signature rejected';
      throw new ApiError(message, 401);
    }
    const { signature, hash } = signatureResult;

    const trainerSigned = role === 'trainer' ? true : Boolean(record.trainerSignature);
    const traineeSigned = role === 'trainee' ? true : Boolean(record.traineeSignature);
    const bothSigned = trainerSigned && traineeSigned;

    const data: Prisma.OJTRecordUpdateInput = {};
    if (role === 'trainer') {
      data.trainerSignature = hash;
      data.trainerSignedAt = signature.signedAt;
    } else {
      data.traineeSignature = hash;
      data.traineeSignedAt = signature.signedAt;
    }
    if (bothSigned) data.locked = true;

    const updated = await prisma.oJTRecord.update({ where: { id: record.id }, data });

    await logAction({
      userId: user.id,
      action: role === 'trainer' ? 'OJT_TRAINER_SIGNED' : 'OJT_TRAINEE_SIGNED',
      entityType: 'OJTRecord',
      entityId: record.id,
      newValue: { signatureId: signature.id, meaning },
      changeReason: meaning,
      ojtRecordId: record.id,
      ipAddress,
    });

    if (bothSigned) {
      await logAction({
        userId: user.id,
        action: 'OJT_LOCKED',
        entityType: 'OJTRecord',
        entityId: record.id,
        newValue: { locked: true, overallResult: record.overallResult },
        changeReason: 'Both signatures applied — record locked (ALCOA+ enduring)',
        ojtRecordId: record.id,
        ipAddress,
      });

      if (record.overallResult === 'FAIL') {
        await checkAndCreateCAPA({
          trigger: 'OJT_FAILED',
          userId: record.traineeId,
          companyId: record.trainee.companyId,
          machineId: record.machineId,
          details: {
            description: `OJT assessment failed for ${record.trainee.name} on ${record.machine.name}`,
          },
        });
      }

      await sendOJTCompletion(
        { id: record.trainee.id, name: record.trainee.name, email: record.trainee.email },
        { name: record.trainer.name },
        record.overallResult
      );
    }

    return { record: updated, locked: bothSigned };
  });
}
