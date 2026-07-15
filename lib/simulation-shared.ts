import type { Fault, FaultResponse, StageKey } from './types';
import { DISPENSING_FORMULA, COATING_FORMULA } from './simulation-engine';
import { getRandomFaults, getFaultById } from './fault-library';

/**
 * Shared (server + client safe) simulation contracts and helpers.
 * IMPORTANT: this module must never import server-only modules (e.g. prisma),
 * so it can be used inside client components as well as API routes.
 */

/** Penalty (points) applied when a required deviation is not documented. */
export const DEVIATION_PENALTY = 3;

/** A single formula line as sent to the client (target + tolerance only). */
export interface FormulaLine {
  material: string;
  target: number;
  tolerancePct: number;
}

/** Process targets used across the simulation stages. */
export interface SimTargets {
  weight: number;
  hardness: number;
  thickness: number;
  lod: number;
  weightGain: number;
}

/** The configuration payload delivered to the runner (server → client). */
export interface SimConfigDTO {
  machineId: string;
  machineName: string;
  productName: string;
  batchSize: number;
  requalifyMonths: number;
  targets: SimTargets;
  dispensingFormula: FormulaLine[];
  coatingFormula: FormulaLine[];
  /** Faults injected per stage for this run. */
  faults: Record<StageKey, Fault[]>;
}

/** Response from POST /api/simulation/start. */
export interface SimStartResponse {
  batchNumber: string;
  startedAt: string;
  config: SimConfigDTO;
}

/** Response from POST /api/simulation/submit. */
export interface SimSubmitResponse {
  id: string;
  totalScore: number;
  passed: boolean;
  stageScores: Record<string, number>;
  feedback: string;
  bmrData: Record<string, unknown>;
  certificateUrl: string | null;
}

/** Number of faults to inject per stage in the synthesized default config. */
export const STAGE_FAULT_COUNTS: Record<StageKey, number> = {
  dispensing: 1,
  granulation: 1,
  compression: 2,
  coating: 1,
  qc: 1,
  bmr: 1,
};

export const DEFAULT_TARGETS: SimTargets = {
  weight: 500,
  hardness: 6.5,
  thickness: 3.5,
  lod: 2.0,
  weightGain: 3.0,
};

/** Standard GMP root-cause categories offered on the deviation form. */
export const DEVIATION_ROOT_CAUSES: string[] = [
  'Equipment malfunction / calibration',
  'Material / component out of specification',
  'Process parameter drift',
  'Environmental excursion (Temp/RH)',
  'Operator / procedural error',
  'Utility / power interruption',
];

/** Standard corrective actions offered on the deviation form. */
export const DEVIATION_ACTIONS: string[] = [
  'Stopped process and escalated to QA',
  'Adjusted parameter to setpoint and verified',
  'Quarantined affected material / tablets',
  'Recalibrated / cleared equipment per SOP',
  'Restored environmental controls before resuming',
  'Documented and continued under QA approval',
];

/** Impact classification for a deviation entry. */
export function severityToImpact(severity: Fault['severity']): string {
  switch (severity) {
    case 'CRITICAL':
      return 'Potential impact to product quality / patient safety — full investigation required.';
    case 'HIGH':
      return 'Significant process impact — batch disposition pending assessment.';
    case 'MEDIUM':
      return 'Moderate impact — controlled and documented, no product risk after action.';
    default:
      return 'Low impact — corrected in-line, no effect on product quality.';
  }
}

/**
 * Synthesize a default per-stage fault injection set from the library.
 * Deterministic per (machineId) so re-fetching is stable within a session.
 */
export function buildDefaultFaults(seed: number): Record<StageKey, Fault[]> {
  const stages: StageKey[] = ['dispensing', 'granulation', 'compression', 'coating', 'qc', 'bmr'];
  const out = {} as Record<StageKey, Fault[]>;
  for (const stage of stages) {
    out[stage] = getRandomFaults(stage, STAGE_FAULT_COUNTS[stage], seed + stage.length);
  }
  return out;
}

/**
 * Build the default configuration DTO for a machine when no persisted
 * SimulationConfig exists.
 */
export function buildDefaultConfig(machine: {
  id: string;
  name: string;
  requalifyMonths: number;
}): SimConfigDTO {
  const seed = machine.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) || 1;
  return {
    machineId: machine.id,
    machineName: machine.name,
    productName: 'Paracetamol 500mg',
    batchSize: 400000,
    requalifyMonths: machine.requalifyMonths,
    targets: { ...DEFAULT_TARGETS },
    dispensingFormula: DISPENSING_FORMULA.map((m) => ({ ...m })),
    coatingFormula: COATING_FORMULA.map((m) => ({ ...m })),
    faults: buildDefaultFaults(seed),
  };
}

/**
 * Compute the total fault points delta (award/deduct) for a set of responses,
 * including the missing-deviation penalty. Used identically on client (display)
 * and server (authoritative) so the two never diverge.
 */
export function computeFaultDelta(responses: FaultResponse[]): number {
  let delta = 0;
  for (const r of responses) {
    const fault = getFaultById(r.faultId);
    if (!fault) continue;
    const correct = r.selectedOption === fault.correctAnswer;
    delta += correct ? fault.points : -5;
    if (fault.deviationRequired && r.deviationDocumented === false) {
      delta -= DEVIATION_PENALTY;
    }
  }
  return delta;
}

/** All six stage keys in canonical order. */
export const STAGE_ORDER: StageKey[] = [
  'dispensing',
  'granulation',
  'compression',
  'coating',
  'qc',
  'bmr',
];
