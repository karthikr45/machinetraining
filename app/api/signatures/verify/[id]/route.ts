import { requireUser, handle } from '@/lib/api-helpers';
import { verifySignature } from '@/lib/electronic-signature';

/**
 * GET /api/signatures/verify/[id]
 * Verify that an electronic signature is present and valid.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    await requireUser();
    const valid = await verifySignature(params.id);
    return { id: params.id, valid };
  });
}
