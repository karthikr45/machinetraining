import type {
  StageResult,
  FaultResponse,
  MaterialEntry,
  BMRDocument,
  DeviationLogEntry,
  StageKey,
} from './types';
import { SIMULATION_STAGES } from './types';
import { round, generateBatchNumber } from './utils';

export { generateBatchNumber };

/** Default dispensing formula for Paracetamol 500mg, 400,000 tablets (200 kg). */
export const DISPENSING_FORMULA: Omit<MaterialEntry, 'entered' | 'variancePct' | 'status'>[] = [
  { material: 'Paracetamol API', target: 200.0, tolerancePct: 2 },
  { material: 'Lactose Monohydrate', target: 150.0, tolerancePct: 2 },
  { material: 'MCC PH102', target: 100.0, tolerancePct: 2 },
  { material: 'PVP K30', target: 20.0, tolerancePct: 2 },
  { material: 'Mg Stearate', target: 5.0, tolerancePct: 2 },
  { material: 'Talc', target: 3.0, tolerancePct: 2 },
  { material: 'Coloring Agent', target: 0.5, tolerancePct: 2 },
];

export const COATING_FORMULA: Omit<MaterialEntry, 'entered' | 'variancePct' | 'status'>[] = [
  { material: 'HPMC E5', target: 60.0, tolerancePct: 3 },
  { material: 'PEG 6000', target: 6.0, tolerancePct: 3 },
  { material: 'TiO2', target: 4.0, tolerancePct: 3 },
  { material: 'Purified Water', target: 1000.0, tolerancePct: 3 },
  { material: 'Color Lake', target: 0.5, tolerancePct: 3 },
];

/** Evaluate a single dispensed material against target + tolerance. */
export function evaluateMaterial(
  target: number,
  tolerancePct: number,
  entered: number
): { variancePct: number; status: MaterialEntry['status']; points: number } {
  if (!entered || target === 0) {
    return { variancePct: 0, status: 'fail', points: 0 };
  }
  const variance = ((entered - target) / target) * 100;
  const abs = Math.abs(variance);
  let status: MaterialEntry['status'];
  let points: number;
  if (abs <= tolerancePct) {
    status = 'ok';
    points = 2; // full points per material (7 materials ~ up to 14)
  } else if (abs <= 5) {
    status = 'warn';
    points = -1;
  } else {
    status = 'fail';
    points = -3;
  }
  return { variancePct: round(variance, 2), status, points };
}

/** In-process check: mean, SD, CV% for weight, plus verdict correctness. */
export function validateInProcessCheck(
  weights: number[],
  targetWeight: number,
  tolerance = 25
): { mean: number; sd: number; cv: number; withinSpec: boolean; recommendation: string } {
  const n = weights.length || 1;
  const mean = weights.reduce((a, b) => a + b, 0) / n;
  const variance = weights.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const sd = Math.sqrt(variance);
  const cv = mean === 0 ? 0 : (sd / mean) * 100;
  const withinSpec =
    weights.every((w) => Math.abs(w - targetWeight) <= tolerance) && cv <= 2;
  let recommendation = 'continue';
  if (cv > 2) recommendation = 'adjust_feeder';
  else if (mean < targetWeight - tolerance) recommendation = 'increase_force';
  else if (!withinSpec) recommendation = 'stop';
  return {
    mean: round(mean, 2),
    sd: round(sd, 2),
    cv: round(cv, 2),
    withinSpec,
    recommendation,
  };
}

/** Generate 10 tablet readings near target for an in-process check (seeded). */
export function generateTabletReadings(
  seed: number,
  targetWeight = 500,
  targetHardness = 6.5,
  targetThickness = 3.5
): { weight: number; hardness: number; thickness: number }[] {
  const rows: { weight: number; hardness: number; thickness: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const r1 = Math.sin(seed + i * 1.7) * 0.5;
    const r2 = Math.cos(seed + i * 2.3) * 0.5;
    const r3 = Math.sin(seed + i * 3.1) * 0.5;
    rows.push({
      weight: round(targetWeight + r1 * 6, 1),
      hardness: round(targetHardness + r2 * 0.8, 1),
      thickness: round(targetThickness + r3 * 0.06, 2),
    });
  }
  return rows;
}

/** Compute a stage score bounded to its max points. */
export function calculateStageScore(stage: StageResult): number {
  const meta = SIMULATION_STAGES.find((s) => s.key === stage.stage);
  const max = meta?.maxPoints ?? 15;
  return Math.max(0, Math.min(max, round(stage.score, 1)));
}

/** Total the simulation score from stage results (0–100). */
export function calculateTotalScore(stages: StageResult[]): number {
  const total = stages.reduce((sum, s) => sum + calculateStageScore(s), 0);
  return Math.max(0, Math.min(100, round(total, 1)));
}

/** Yield reconciliation from stage data. */
export function calculateBatchYield(input: {
  theoretical: number;
  tabletsProduced: number;
  rejects: number;
  samples: number;
  coatingLoss: number;
}): number {
  const good = input.tabletsProduced - input.rejects - input.samples;
  const yieldPct = input.theoretical === 0 ? 0 : (good / input.theoretical) * 100;
  return round(yieldPct, 2);
}

/** Aggregate all deviations from stage results. */
export function collectDeviations(stages: StageResult[]): DeviationLogEntry[] {
  return stages.flatMap((s) => s.deviations ?? []);
}

/** Build the BMR document from all stage data. */
export function generateBMRData(input: {
  productName: string;
  batchNumber: string;
  batchSize: number;
  stages: StageResult[];
  faultResponses: FaultResponse[];
}): BMRDocument {
  const dispensingStage = input.stages.find((s) => s.stage === 'dispensing');
  const dispensing = (dispensingStage?.data?.materials as MaterialEntry[]) ?? [];

  const tabletsProduced = input.batchSize;
  const rejects = Math.round(input.batchSize * 0.0002 * 3); // ~small reject rate
  const samples = 200 + 30 + 10; // AQL + hardness + others
  const coatingLoss = Math.round(input.batchSize * 0.003);
  const theoretical = input.batchSize;
  const yieldPct = calculateBatchYield({
    theoretical,
    tabletsProduced,
    rejects,
    samples,
    coatingLoss,
  });
  const actualYield = tabletsProduced - rejects - samples - coatingLoss;

  const now = new Date();
  const expiry = new Date(now);
  expiry.setFullYear(expiry.getFullYear() + 2);

  return {
    productName: input.productName,
    batchNumber: input.batchNumber,
    batchSize: input.batchSize,
    manufacturingDate: now.toISOString(),
    expiryDate: expiry.toISOString(),
    theoreticalYield: theoretical,
    actualYield,
    yieldPct,
    dispensing,
    granulation: input.stages.find((s) => s.stage === 'granulation')?.data ?? {},
    compression: input.stages.find((s) => s.stage === 'compression')?.data ?? {},
    coating: input.stages.find((s) => s.stage === 'coating')?.data ?? {},
    qc: input.stages.find((s) => s.stage === 'qc')?.data ?? {},
    deviations: collectDeviations(input.stages),
    reconciliation: {
      input: theoretical,
      tabletsProduced,
      rejects,
      samples,
      coatingLoss,
      yieldPct,
    },
  };
}

/** Simple stage-key helper. */
export function stageMaxPoints(stage: StageKey): number {
  return SIMULATION_STAGES.find((s) => s.key === stage)?.maxPoints ?? 15;
}

export const PASS_THRESHOLD = 75;
