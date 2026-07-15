import { handle, requireUser, ApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { chatWithMachineAI } from '@/lib/claude';

export const dynamic = "force-dynamic";

interface ChatBody {
  machineId: string;
  message: string;
}

/**
 * POST a message to the machine-specific AI trainer.
 * Loads the machine, its latest processed document text, and recent chat
 * history for this user, then persists the exchange.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as ChatBody | null;
    if (!body?.machineId || !body?.message?.trim()) {
      throw new ApiError('machineId and a non-empty message are required', 422);
    }

    const machine = await prisma.machine.findUnique({
      where: { id: body.machineId },
      select: { id: true, name: true, type: true, companyId: true },
    });
    if (!machine || machine.companyId !== user.companyId) {
      throw new ApiError('Machine not found', 404);
    }

    const latestDoc = await prisma.document.findFirst({
      where: { machineId: machine.id, processed: true, extractedText: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { extractedText: true },
    });

    const recent = await prisma.chatMessage.findMany({
      where: { userId: user.id, machineId: machine.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { message: true, response: true },
    });

    const history = recent
      .reverse()
      .flatMap((m) => [
        { role: 'user' as const, content: m.message },
        { role: 'assistant' as const, content: m.response },
      ]);

    const response = await chatWithMachineAI(
      {
        machineName: machine.name,
        machineType: machine.type,
        manualText: latestDoc?.extractedText ?? null,
      },
      history,
      body.message.trim()
    );

    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        machineId: machine.id,
        message: body.message.trim(),
        response,
      },
    });

    return { response };
  });
}
