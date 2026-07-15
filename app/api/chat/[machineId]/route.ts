import { handle, requireUser, ApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";

/** GET the caller's chat history for a machine (ordered ascending). */
export async function GET(
  _req: Request,
  { params }: { params: { machineId: string } }
) {
  return handle(async () => {
    const user = await requireUser();

    const machine = await prisma.machine.findUnique({
      where: { id: params.machineId },
      select: { id: true, companyId: true, name: true },
    });
    if (!machine || machine.companyId !== user.companyId) {
      throw new ApiError('Machine not found', 404);
    }

    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id, machineId: machine.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, message: true, response: true, createdAt: true },
    });

    return { machineId: machine.id, machineName: machine.name, messages };
  });
}
