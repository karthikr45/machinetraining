import type { Prisma, SOPStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';
import { validateUpload, saveUploadedFile, extractTextFromFile } from '@/lib/pdf-parser';

const SOP_STATUSES: SOPStatus[] = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'OBSOLETE'];

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

/** GET /api/sop — list SOPs for the caller's company. Optional ?machineId= &status= */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId');
    const status = searchParams.get('status');

    const where: Prisma.SOPDocumentWhereInput = { companyId: user.companyId };
    if (machineId) where.machineId = machineId;
    if (status && SOP_STATUSES.includes(status as SOPStatus)) {
      where.status = status as SOPStatus;
    }

    const sops = await prisma.sOPDocument.findMany({
      where,
      orderBy: [{ sopNumber: 'asc' }, { createdAt: 'desc' }],
      include: { machine: { select: { id: true, name: true } } },
    });

    return { sops };
  });
}

interface CreateSopJsonBody {
  title?: string;
  sopNumber?: string;
  machineId?: string | null;
  version?: string;
  status?: string;
  effectiveDate?: string | null;
  reviewDate?: string | null;
  filePath?: string | null;
}

/** POST /api/sop — create a SOP (managers). Accepts JSON or multipart/form-data with a file. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);
    const contentType = req.headers.get('content-type') || '';

    let title = '';
    let sopNumber = '';
    let machineId: string | null = null;
    let version = '1.0';
    let statusRaw = 'DRAFT';
    let effectiveDate: Date | null = null;
    let reviewDate: Date | null = null;
    let filePath: string | null = null;
    let extractedText: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      title = String(form.get('title') ?? '').trim();
      sopNumber = String(form.get('sopNumber') ?? '').trim();
      const m = form.get('machineId');
      machineId = m ? String(m).trim() || null : null;
      version = String(form.get('version') ?? '1.0').trim() || '1.0';
      statusRaw = String(form.get('status') ?? 'DRAFT');
      effectiveDate = parseDate(form.get('effectiveDate'));
      reviewDate = parseDate(form.get('reviewDate'));

      const file = form.get('file');
      if (file && file instanceof File && file.size > 0) {
        const err = validateUpload({ type: file.type, size: file.size });
        if (err) throw new ApiError(err, 422);
        const buffer = Buffer.from(await file.arrayBuffer());
        const saved = await saveUploadedFile(buffer, file.name, 'sops');
        filePath = saved.publicPath;
        extractedText = await extractTextFromFile(saved.filePath);
      }
    } else {
      const body = (await req.json()) as CreateSopJsonBody;
      title = body.title?.trim() ?? '';
      sopNumber = body.sopNumber?.trim() ?? '';
      machineId = body.machineId?.trim() || null;
      version = body.version?.trim() || '1.0';
      statusRaw = body.status ?? 'DRAFT';
      effectiveDate = parseDate(body.effectiveDate);
      reviewDate = parseDate(body.reviewDate);
      filePath = body.filePath?.trim() || null;
    }

    if (!title) throw new ApiError('SOP title is required', 422);
    if (!sopNumber) throw new ApiError('SOP number is required', 422);

    const status: SOPStatus = SOP_STATUSES.includes(statusRaw as SOPStatus)
      ? (statusRaw as SOPStatus)
      : 'DRAFT';

    if (machineId) {
      const machine = await prisma.machine.findFirst({
        where: { id: machineId, companyId: user.companyId },
        select: { id: true },
      });
      if (!machine) throw new ApiError('Linked machine not found in your company', 422);
    }

    const sop = await prisma.sOPDocument.create({
      data: {
        companyId: user.companyId,
        machineId,
        title,
        sopNumber,
        version,
        status,
        effectiveDate,
        reviewDate,
        filePath,
        extractedText,
      },
      include: { machine: { select: { id: true, name: true } } },
    });

    await logAction({
      userId: user.id,
      action: 'SOP_CREATED',
      entityType: 'SOPDocument',
      entityId: sop.id,
      newValue: { sopNumber: sop.sopNumber, title: sop.title, version: sop.version, status: sop.status },
      changeReason: 'SOP created',
      sopDocumentId: sop.id,
      ipAddress: getClientIp(req.headers),
    });

    return { sop };
  });
}
