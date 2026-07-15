import { prisma } from '@/lib/prisma';
import { requireUser, handle } from '@/lib/api-helpers';

/**
 * GET /api/notifications
 * Recent NotificationLog entries for the caller, newest first.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const takeRaw = Number(searchParams.get('take'));
    const take = Number.isFinite(takeRaw) && takeRaw > 0 ? Math.min(Math.trunc(takeRaw), 100) : 30;

    const rows = await prisma.notificationLog.findMany({
      where: { userId: user.id },
      orderBy: { sentAt: 'desc' },
      take,
    });

    return {
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        subject: n.subject,
        message: n.message,
        sentAt: n.sentAt,
        delivered: n.delivered,
      })),
    };
  });
}
