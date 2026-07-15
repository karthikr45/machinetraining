import type { ModuleType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole, handle, ApiError } from '@/lib/api-helpers';
import { MANAGER_ROLES } from '@/lib/auth';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';
import { extractTextFromFile } from '@/lib/pdf-parser';
import { generateTrainingContent } from '@/lib/claude';

interface ProcessBody {
  documentId?: string;
  generateModules?: boolean;
}

// Module types generated from a processed manual, with estimated durations.
const GENERATED_MODULE_TYPES: { type: ModuleType; minutes: number }[] = [
  { type: 'OVERVIEW', minutes: 10 },
  { type: 'OPERATION', minutes: 20 },
  { type: 'SAFETY', minutes: 15 },
];

/** POST /api/documents/process — extract text and optionally generate modules. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole(MANAGER_ROLES);

    const { searchParams } = new URL(req.url);
    const body = (await req.json().catch(() => ({}))) as ProcessBody;
    const documentId = body.documentId;
    if (!documentId) throw new ApiError('documentId is required', 422);

    const generateModules =
      searchParams.get('generate') === 'true' || body.generateModules === true;

    const document = await prisma.document.findFirst({
      where: { id: documentId, machine: { companyId: user.companyId } },
      include: { machine: { select: { id: true, name: true, type: true, manufacturer: true } } },
    });
    if (!document) throw new ApiError('Document not found', 404);

    const extractedText = await extractTextFromFile(document.filePath);

    await prisma.document.update({
      where: { id: document.id },
      data: { extractedText, processed: true },
    });

    let createdModules = 0;
    const moduleTitles: string[] = [];

    if (generateModules) {
      const last = await prisma.trainingModule.findFirst({
        where: { machineId: document.machine.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      let order = (last?.order ?? 0) + 1;

      for (const spec of GENERATED_MODULE_TYPES) {
        const generated = await generateTrainingContent(
          {
            name: document.machine.name,
            type: document.machine.type,
            manufacturer: document.machine.manufacturer,
          },
          extractedText,
          spec.type
        );

        const title = `${document.machine.name} — ${spec.type.charAt(0)}${spec.type
          .slice(1)
          .toLowerCase()}`;

        const module = await prisma.trainingModule.create({
          data: {
            machineId: document.machine.id,
            title,
            content: generated.content as unknown as Prisma.InputJsonValue,
            moduleType: spec.type,
            order,
            estimatedMinutes: spec.minutes,
            sopVersion: '1.0',
            ...(generated.quiz.length > 0
              ? {
                  quiz: {
                    create: {
                      questions: generated.quiz as unknown as Prisma.InputJsonValue,
                    },
                  },
                }
              : {}),
          },
        });

        moduleTitles.push(module.title);
        createdModules += 1;
        order += 1;
      }
    }

    await logAction({
      userId: user.id,
      action: generateModules ? 'DOCUMENT_PROCESSED_WITH_MODULES' : 'DOCUMENT_PROCESSED',
      entityType: 'Document',
      entityId: document.id,
      newValue: {
        extractedLength: extractedText.length,
        modulesCreated: createdModules,
      },
      ipAddress: getClientIp(req.headers),
    });

    return {
      documentId: document.id,
      extractedTextLength: extractedText.length,
      createdModules,
      moduleTitles,
    };
  });
}
