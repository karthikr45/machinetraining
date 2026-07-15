import { prisma } from '@/lib/prisma';
import { requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';
import { validateUpload, saveUploadedFile } from '@/lib/pdf-parser';

/** POST /api/documents/upload — multipart form (machineId + file). Managers only. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);

    const form = await req.formData();
    const machineId = form.get('machineId');
    const file = form.get('file');

    if (typeof machineId !== 'string' || !machineId) {
      throw new ApiError('machineId is required', 422);
    }
    if (!(file instanceof File)) {
      throw new ApiError('A file is required', 422);
    }

    const machine = await prisma.machine.findFirst({
      where: { id: machineId, companyId: user.companyId },
      select: { id: true },
    });
    if (!machine) throw new ApiError('Machine not found', 404);

    const validationError = validateUpload({ type: file.type, size: file.size });
    if (validationError) throw new ApiError(validationError, 422);

    const buffer = Buffer.from(await file.arrayBuffer());
    const { filePath } = await saveUploadedFile(buffer, file.name || 'document');

    const document = await prisma.document.create({
      data: {
        machineId: machine.id,
        fileName: file.name || 'document',
        filePath,
        fileType: file.type,
        fileSize: file.size,
        processed: false,
      },
    });

    await logAction({
      userId: user.id,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: document.id,
      newValue: { fileName: document.fileName, machineId: machine.id },
      ipAddress: getClientIp(req.headers),
    });

    return { document };
  });
}
