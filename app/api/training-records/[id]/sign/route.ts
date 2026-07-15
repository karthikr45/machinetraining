import { handle, requireUser, ApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { createElectronicSignature, verifyPassword } from '@/lib/electronic-signature';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

interface SignBody {
  password: string;
  meaning: string;
}

/**
 * POST an electronic signature onto a training record (21 CFR Part 11).
 * Verifies the caller's password, records the signature, and stamps the record.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return handle(async () => {
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as SignBody | null;
    if (!body?.password || !body?.meaning) {
      throw new ApiError('password and meaning are required', 422);
    }

    const record = await prisma.trainingRecord.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, companyId: true } },
        machine: { select: { id: true, name: true } },
        module: { select: { id: true, title: true } },
      },
    });

    if (!record || record.user.companyId !== user.companyId) {
      throw new ApiError('Training record not found', 404);
    }
    if (record.signature) {
      throw new ApiError('This record is already signed', 409);
    }

    const passwordValid = await verifyPassword(user.id, body.password);
    if (!passwordValid) {
      throw new ApiError('Invalid password — signature rejected', 401);
    }

    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') ?? undefined;

    const { signature, hash } = await createElectronicSignature({
      userId: user.id,
      recordType: 'TrainingRecord',
      recordId: record.id,
      meaning: body.meaning,
      password: body.password,
      ipAddress,
      userAgent,
    });

    const updated = await prisma.trainingRecord.update({
      where: { id: record.id },
      data: {
        signature: hash,
        signedAt: signature.signedAt,
        signedBy: user.id,
      },
    });

    await logAction({
      userId: user.id,
      action: 'SIGN',
      entityType: 'TrainingRecord',
      entityId: record.id,
      newValue: { signatureId: signature.id, meaning: body.meaning },
      changeReason: body.meaning,
      ipAddress,
      trainingRecordId: record.id,
    });

    return {
      record: updated,
      signature: {
        id: signature.id,
        meaning: signature.meaning,
        signedAt: signature.signedAt,
        signedByUserId: user.id,
        signedByName: user.name,
      },
    };
  });
}
