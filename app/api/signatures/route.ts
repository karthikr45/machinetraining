import { prisma } from '@/lib/prisma';
import { requireUser, handle, ApiError } from '@/lib/api-helpers';
import { createElectronicSignature, getSignatureManifest } from '@/lib/electronic-signature';
import { ROLE_LABELS } from '@/lib/types';
import { getClientIp } from '@/lib/utils';

export const dynamic = "force-dynamic";

/**
 * GET /api/signatures
 * With ?recordId= &recordType= → the signature manifest for that record.
 * Otherwise → recent electronic signatures for the caller's company.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('recordId');
    const recordType = searchParams.get('recordType');

    if (recordId && recordType) {
      const manifest = await getSignatureManifest(recordId, recordType);
      return {
        signatures: manifest.map((s) => ({
          id: s.id,
          recordType: s.recordType,
          recordId: s.recordId,
          meaning: s.meaning,
          signedAt: s.signedAt,
          isValid: s.isValid,
          ipAddress: s.ipAddress,
          userName: s.user.name,
          userRole: ROLE_LABELS[s.user.role],
        })),
      };
    }

    const rows = await prisma.electronicSignature.findMany({
      where: { user: { companyId: user.companyId } },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { signedAt: 'desc' },
      take: 100,
    });

    return {
      signatures: rows.map((s) => ({
        id: s.id,
        recordType: s.recordType,
        recordId: s.recordId,
        meaning: s.meaning,
        signedAt: s.signedAt,
        isValid: s.isValid,
        ipAddress: s.ipAddress,
        userName: s.user.name,
        userRole: ROLE_LABELS[s.user.role],
      })),
    };
  });
}

interface SignBody {
  recordType?: string;
  recordId?: string;
  meaning?: string;
  password?: string;
}

/**
 * POST /api/signatures
 * Create a 21 CFR Part 11 electronic signature.
 * Body: { recordType, recordId, meaning, password }
 */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = (await req.json()) as SignBody;

    const recordType = body.recordType?.trim();
    const recordId = body.recordId?.trim();
    const meaning = body.meaning?.trim();
    const password = body.password;

    if (!recordType) throw new ApiError('recordType is required', 422);
    if (!recordId) throw new ApiError('recordId is required', 422);
    if (!meaning) throw new ApiError('Signature meaning is required', 422);
    if (!password) throw new ApiError('Password is required to sign', 422);

    let result;
    try {
      result = await createElectronicSignature({
        userId: user.id,
        recordType,
        recordId,
        meaning,
        password,
        ipAddress: getClientIp(req.headers),
        userAgent: req.headers.get('user-agent') ?? undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signature rejected';
      throw new ApiError(message, 401);
    }

    return {
      signature: {
        id: result.signature.id,
        recordType: result.signature.recordType,
        recordId: result.signature.recordId,
        meaning: result.signature.meaning,
        signedAt: result.signature.signedAt,
        isValid: result.signature.isValid,
      },
      hash: result.hash,
    };
  });
}
