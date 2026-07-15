import { handle, requireUser, ApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import type { QuizQuestion } from '@/lib/types';

export const dynamic = "force-dynamic";

/**
 * GET the quiz for a module (company-scoped via module → machine → company).
 * Answers (correctIndex / explanation) are stripped from the payload.
 */
export async function GET(
  _req: Request,
  { params }: { params: { moduleId: string } }
) {
  return handle(async () => {
    const user = await requireUser();

    const moduleRecord = await prisma.trainingModule.findUnique({
      where: { id: params.moduleId },
      include: {
        machine: { select: { id: true, companyId: true, name: true } },
        quiz: true,
      },
    });

    if (!moduleRecord || moduleRecord.machine.companyId !== user.companyId) {
      throw new ApiError('Module not found', 404);
    }
    if (!moduleRecord.quiz) {
      throw new ApiError('This module has no quiz', 404);
    }

    const questions = (moduleRecord.quiz.questions as unknown as QuizQuestion[]) ?? [];
    const publicQuestions = questions.map((q) => ({
      id: q.id,
      question: q.question,
      questionHi: q.questionHi,
      options: q.options,
      optionsHi: q.optionsHi,
    }));

    const record = await prisma.trainingRecord.findFirst({
      where: { userId: user.id, moduleId: moduleRecord.id },
      select: { attempts: true, status: true, score: true },
    });

    const attempts = record?.attempts ?? 0;
    const blocked =
      attempts >= moduleRecord.quiz.maxAttempts && record?.status !== 'COMPLETED';

    return {
      moduleId: moduleRecord.id,
      title: moduleRecord.title,
      titleHi: moduleRecord.titleHi,
      machineId: moduleRecord.machine.id,
      machineName: moduleRecord.machine.name,
      passingScore: moduleRecord.quiz.passingScore,
      maxAttempts: moduleRecord.quiz.maxAttempts,
      attempts,
      status: record?.status ?? 'NOT_STARTED',
      blocked,
      questions: publicQuestions,
    };
  });
}
