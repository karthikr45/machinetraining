import { handle, requireUser, ApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/audit-logger';
import { checkAndCreateCAPA } from '@/lib/capa-engine';
import { computeExpiryDate } from '@/lib/expiry-checker';
import { getClientIp } from '@/lib/utils';
import type { QuizQuestion } from '@/lib/types';

interface SubmitBody {
  answers: number[];
}

/**
 * POST an attempt for a module quiz. Grades against stored correctIndex,
 * upserts the module TrainingRecord, sets expiry on pass, and raises a CAPA
 * (blocking further attempts) after the max failed attempts.
 */
export async function POST(
  req: Request,
  { params }: { params: { moduleId: string } }
) {
  return handle(async () => {
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as SubmitBody | null;
    if (!body || !Array.isArray(body.answers)) {
      throw new ApiError('answers array is required', 422);
    }

    const moduleRecord = await prisma.trainingModule.findUnique({
      where: { id: params.moduleId },
      include: {
        machine: { select: { id: true, companyId: true, requalifyMonths: true } },
        quiz: true,
      },
    });

    if (!moduleRecord || moduleRecord.machine.companyId !== user.companyId) {
      throw new ApiError('Module not found', 404);
    }
    if (!moduleRecord.quiz) {
      throw new ApiError('This module has no quiz', 404);
    }

    const { quiz, machine } = moduleRecord;
    const questions = (quiz.questions as unknown as QuizQuestion[]) ?? [];
    if (questions.length === 0) {
      throw new ApiError('Quiz has no questions', 422);
    }

    const existing = await prisma.trainingRecord.findFirst({
      where: { userId: user.id, moduleId: moduleRecord.id },
    });

    // Already exhausted attempts without passing — block.
    if (
      existing &&
      existing.status !== 'COMPLETED' &&
      existing.attempts >= quiz.maxAttempts
    ) {
      return {
        blocked: true,
        capaCreated: false,
        passed: false,
        score: existing.score ?? 0,
        attempts: existing.attempts,
        passingScore: quiz.passingScore,
        maxAttempts: quiz.maxAttempts,
        results: [],
        message: 'Maximum attempts reached. Contact your supervisor.',
      };
    }

    // Grade.
    let correctCount = 0;
    const results = questions.map((q, i) => {
      const selected = typeof body.answers[i] === 'number' ? body.answers[i] : -1;
      const correct = selected === q.correctIndex;
      if (correct) correctCount++;
      return {
        questionId: q.id,
        selected,
        correctIndex: q.correctIndex,
        correct,
        explanation: q.explanation,
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passingScore;
    const attempts = (existing?.attempts ?? 0) + 1;
    const now = new Date();
    const expiresAt = passed ? computeExpiryDate(machine.requalifyMonths, now) : null;

    const data = {
      status: passed ? ('COMPLETED' as const) : ('FAILED' as const),
      score,
      attempts,
      completedAt: passed ? now : existing?.completedAt ?? null,
      expiresAt: passed ? expiresAt : existing?.expiresAt ?? null,
      startedAt: existing?.startedAt ?? now,
    };

    const record = existing
      ? await prisma.trainingRecord.update({ where: { id: existing.id }, data })
      : await prisma.trainingRecord.create({
          data: {
            userId: user.id,
            machineId: machine.id,
            moduleId: moduleRecord.id,
            ...data,
          },
        });

    const blocked = !passed && attempts >= quiz.maxAttempts;
    let capaCreated = false;

    if (blocked) {
      const capa = await checkAndCreateCAPA({
        trigger: 'QUIZ_FAILED_3_TIMES',
        userId: user.id,
        companyId: user.companyId,
        machineId: machine.id,
        details: {
          trainingRecordId: record.id,
          description: `${user.name} failed the "${moduleRecord.title}" quiz ${attempts} times (last score ${score}%). Competency review required.`,
        },
      });
      capaCreated = Boolean(capa);
    }

    await logAction({
      userId: user.id,
      action: passed ? 'QUIZ_PASSED' : 'QUIZ_FAILED',
      entityType: 'TrainingRecord',
      entityId: record.id,
      newValue: { score, passed, attempts, moduleId: moduleRecord.id },
      changeReason: `Quiz attempt ${attempts}/${quiz.maxAttempts} — score ${score}%`,
      ipAddress: getClientIp(req.headers),
      trainingRecordId: record.id,
    });

    return {
      score,
      passed,
      attempts,
      blocked,
      capaCreated,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      expiresAt: record.expiresAt,
      results,
    };
  });
}
