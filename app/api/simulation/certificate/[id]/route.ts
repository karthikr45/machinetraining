import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/api-helpers';
import { isManager } from '@/lib/auth';
import { generateCertificateHtml, type CertificateData } from '@/lib/certificate-generator';
import { addMonths } from '@/lib/utils';

export const dynamic = "force-dynamic";

/**
 * GET /api/simulation/certificate/[id]
 * Returns a printable HTML certificate for a passed simulation record.
 * Accessible to the record owner or a manager within the same company.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const record = await prisma.simulationRecord.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, employeeId: true, companyId: true } },
    },
  });

  if (!record || record.user.companyId !== user.companyId) {
    return new Response('Certificate not found', { status: 404 });
  }

  const isOwner = record.userId === user.id;
  if (!isOwner && !isManager(user.role)) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!record.passed) {
    return new Response('No certificate available — simulation was not passed.', { status: 409 });
  }

  const [machine, company] = await Promise.all([
    prisma.machine.findUnique({
      where: { id: record.machineId },
      select: { name: true, requalifyMonths: true },
    }),
    prisma.company.findUnique({
      where: { id: user.companyId },
      select: { name: true, regulatoryFramework: true },
    }),
  ]);

  const requalifyMonths = machine?.requalifyMonths ?? 12;
  const data: CertificateData = {
    recipientName: record.user.name,
    employeeId: record.user.employeeId,
    title: 'Batch Production Simulation',
    machineName: machine?.name ?? 'Manufacturing Equipment',
    batchNumber: record.batchNumber,
    score: Math.round(record.totalScore),
    issuedAt: record.completedAt,
    expiresAt: addMonths(record.completedAt, requalifyMonths),
    certificateId: record.id,
    companyName: company?.name ?? 'PharmaTrainX',
    framework: (company?.regulatoryFramework ?? 'SCHEDULE_M').replace(/_/g, ' '),
  };

  return new Response(generateCertificateHtml(data), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
