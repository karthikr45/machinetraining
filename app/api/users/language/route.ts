import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, requireUser, ApiError } from '@/lib/api-helpers';

const languageSchema = z.object({
  language: z.enum(['en', 'hi']),
});

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();

    const json = await req.json().catch(() => null);
    const parsed = languageSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError('Invalid language', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { preferredLanguage: parsed.data.language },
    });

    return { ok: true };
  });
}
