import { prisma } from '@/lib/prisma';
import { handle, requireUser, ApiError } from '@/lib/api-helpers';
import type { Prisma } from '@prisma/client';
import type {
  SimulationSubmission,
  StageResult,
  FaultResponse,
} from '@/lib/types';
import {
  calculateStageScore,
  calculateTotalScore,
  generateBMRData,
  PASS_THRESHOLD,
} from '@/lib/simulation-engine';
import { getFaultById, evaluateFaultResponse } from '@/lib/fault-library';
import { computeFaultDelta, type SimSubmitResponse } from '@/lib/simulation-shared';
import { loadSimConfigDTO } from '@/lib/simulation-config-loader';
import { verifyPassword, createElectronicSignature } from '@/lib/electronic-signature';
import { checkAndCreateCAPA } from '@/lib/capa-engine';
import { sendSimulationResult } from '@/lib/email-service';
import { generateSimulationFeedback } from '@/lib/claude';
import { logAction } from '@/lib/audit-logger';
import { lockRecord } from '@/lib/alcoa';
import { addMonths, clamp, round, getClientIp } from '@/lib/utils';

function isSubmission(body: unknown): body is SimulationSubmission {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.machineId === 'string' && Array.isArray(b.stages);
}

/**
 * POST /api/simulation/submit
 * Recomputes scores server-side (never trusts client totals), verifies the BMR
 * electronic signature, persists the SimulationRecord, issues a certificate /
 * training completion on pass, or triggers CAPA on fail.
 */
export async function POST(req: Request) {
  return handle(async (): Promise<SimSubmitResponse> => {
    const user = await requireUser();
    const raw = (await req.json()) as unknown;
    if (!isSubmission(raw)) throw new ApiError('Invalid submission payload', 422);

    const submission = raw;
    const machineId = submission.machineId.trim();
    const batchNumber = (submission.batchNumber || '').trim();
    if (!batchNumber) throw new ApiError('batchNumber is required', 422);

    // Validate machine ownership + resolve config (product name, batch size).
    const config = await loadSimConfigDTO(machineId, user.companyId);

    const stages: StageResult[] = submission.stages;
    const faultResponses: FaultResponse[] = Array.isArray(submission.faultResponses)
      ? submission.faultResponses
      : [];

    // --- Authoritative fault evaluation (recomputed server-side) ---
    const evaluatedFaults: FaultResponse[] = faultResponses.map((r) => {
      const fault = getFaultById(r.faultId);
      const result = evaluateFaultResponse(r.faultId, r.selectedOption);
      return {
        faultId: r.faultId,
        stage: fault?.stage ?? r.stage,
        selectedOption: r.selectedOption,
        correct: result.correct,
        pointsAwarded: result.pointsAwarded,
        deviationDocumented: r.deviationDocumented,
        rootCause: r.rootCause,
        actionTaken: r.actionTaken,
      };
    });

    // --- Authoritative scoring ---
    const baseTotal = calculateTotalScore(stages);
    const faultDelta = computeFaultDelta(evaluatedFaults);
    const totalScore = clamp(round(baseTotal + faultDelta, 1), 0, 100);
    const passed = totalScore >= PASS_THRESHOLD;

    const stageScores: Record<string, number> = {};
    for (const s of stages) stageScores[s.stage] = calculateStageScore(s);

    const criticalWrong = evaluatedFaults.some((r) => {
      const fault = getFaultById(r.faultId);
      return fault?.severity === 'CRITICAL' && !r.correct;
    });

    // --- BMR signature (required) ---
    if (!submission.bmrSigned) {
      throw new ApiError('BMR must be signed before submission', 422);
    }
    const password = submission.signaturePassword ?? '';
    if (!password) throw new ApiError('Signature password is required', 422);
    const validPassword = await verifyPassword(user.id, password);
    if (!validPassword) throw new ApiError('Invalid password — BMR signature rejected', 401);

    // --- Build BMR document ---
    const bmrData = generateBMRData({
      productName: config.productName,
      batchNumber,
      batchSize: config.batchSize,
      stages,
      faultResponses: evaluatedFaults,
    });

    const faultsInjected = evaluatedFaults
      .map((r) => getFaultById(r.faultId))
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
      .map((f) => ({
        id: f.id,
        stage: f.stage,
        title: f.title,
        severity: f.severity,
        correctAnswer: f.correctAnswer,
      }));

    const ip = getClientIp(req.headers);

    // --- Persist the record ---
    const record = await prisma.simulationRecord.create({
      data: {
        userId: user.id,
        machineId,
        batchNumber,
        totalScore,
        stageScores: stageScores as Prisma.InputJsonValue,
        faultsInjected: faultsInjected as unknown as Prisma.InputJsonValue,
        faultResponses: evaluatedFaults as unknown as Prisma.InputJsonValue,
        bmrData: bmrData as unknown as Prisma.InputJsonValue,
        status: passed ? 'PASSED' : 'FAILED',
        duration: Math.max(0, Math.round(submission.durationSeconds || 0)),
        passed,
      },
    });

    // --- Electronic signature (21 CFR Part 11) on the BMR ---
    await createElectronicSignature({
      userId: user.id,
      recordType: 'SimulationRecord',
      recordId: record.id,
      meaning:
        'I certify that this Batch Manufacturing Record is accurate, complete, and contemporaneous (Schedule M / 21 CFR Part 11).',
      password,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    let certificateUrl: string | null = null;

    if (passed) {
      certificateUrl = `/api/simulation/certificate/${record.id}`;
      await prisma.simulationRecord.update({
        where: { id: record.id },
        data: { certificateUrl },
      });

      // Machine-level training completion with requalification expiry.
      const now = new Date();
      const expiresAt = addMonths(now, config.requalifyMonths);
      const existing = await prisma.trainingRecord.findFirst({
        where: { userId: user.id, machineId, moduleId: null, sopDocumentId: null },
      });
      if (existing) {
        await prisma.trainingRecord.update({
          where: { id: existing.id },
          data: {
            status: 'COMPLETED',
            score: totalScore,
            completedAt: now,
            expiresAt,
            isRequalification: false,
            attempts: { increment: 1 },
          },
        });
      } else {
        await prisma.trainingRecord.create({
          data: {
            userId: user.id,
            machineId,
            status: 'COMPLETED',
            score: totalScore,
            startedAt: now,
            completedAt: now,
            expiresAt,
            isRequalification: false,
            attempts: 1,
          },
        });
      }
    } else {
      // Low competency → CAPA.
      await checkAndCreateCAPA({
        trigger: 'SIMULATION_SCORE_BELOW_50',
        userId: user.id,
        companyId: user.companyId,
        machineId,
        details: {
          description: `Batch simulation ${batchNumber} scored ${totalScore}/100 (below pass threshold ${PASS_THRESHOLD}). Competency follow-up required.`,
        },
      });
      if (criticalWrong) {
        await checkAndCreateCAPA({
          trigger: 'SIMULATION_CRITICAL_FAULT_WRONG',
          userId: user.id,
          companyId: user.companyId,
          machineId,
          details: {
            description: `Operator answered a CRITICAL fault scenario incorrectly during batch simulation ${batchNumber}.`,
          },
        });
      }
    }

    // Notify the operator.
    await sendSimulationResult({ id: user.id, name: user.name, email: user.email }, totalScore, passed);

    // Audit + lock (immutable record).
    await logAction({
      userId: user.id,
      action: 'SIMULATION_SUBMITTED',
      entityType: 'SimulationRecord',
      entityId: record.id,
      newValue: { batchNumber, totalScore, passed, criticalWrong },
      changeReason: `Batch simulation ${passed ? 'PASSED' : 'FAILED'}`,
      ipAddress: ip,
      simulationRecordId: record.id,
    });
    await lockRecord(record.id, 'SimulationRecord', user.id);

    // AI feedback.
    const faultsCorrect = evaluatedFaults.filter((r) => r.correct).length;
    const feedback = await generateSimulationFeedback({
      totalScore,
      passed,
      stageScores,
      deviations: bmrData.deviations.length,
      faultsCorrect,
      faultsTotal: evaluatedFaults.length,
    });

    return {
      id: record.id,
      totalScore,
      passed,
      stageScores,
      feedback,
      bmrData: bmrData as unknown as Record<string, unknown>,
      certificateUrl,
    };
  });
}
