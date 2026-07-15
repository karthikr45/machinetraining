import { prisma } from './prisma';
import { ApiError } from './api-helpers';
import type { Fault, StageKey } from './types';
import { DISPENSING_FORMULA, COATING_FORMULA } from './simulation-engine';
import {
  buildDefaultConfig,
  buildDefaultFaults,
  type SimConfigDTO,
} from './simulation-shared';

const STAGE_KEYS: StageKey[] = [
  'dispensing',
  'granulation',
  'compression',
  'coating',
  'qc',
  'bmr',
];

/** Narrow an unknown JSON blob into a per-stage fault map, else null. */
function coerceFaults(raw: unknown): Record<StageKey, Fault[]> | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const out = {} as Record<StageKey, Fault[]>;
  let any = false;
  for (const key of STAGE_KEYS) {
    const val = obj[key];
    if (Array.isArray(val)) {
      const faults = val.filter(
        (f): f is Fault =>
          Boolean(f) &&
          typeof (f as Fault).id === 'string' &&
          Array.isArray((f as Fault).options) &&
          typeof (f as Fault).correctAnswer === 'number'
      );
      out[key] = faults;
      if (faults.length) any = true;
    } else {
      out[key] = [];
    }
  }
  return any ? out : null;
}

/**
 * Load the effective simulation configuration DTO for a machine, scoped to the
 * caller's company. If the machine has no persisted SimulationConfig, a default
 * configuration is synthesized from the library defaults (not persisted).
 */
export async function loadSimConfigDTO(
  machineId: string,
  companyId: string
): Promise<SimConfigDTO> {
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, companyId },
    include: { simulationConfig: true },
  });
  if (!machine) throw new ApiError('Machine not found', 404);

  const cfg = machine.simulationConfig;
  if (!cfg) {
    return buildDefaultConfig({
      id: machine.id,
      name: machine.name,
      requalifyMonths: machine.requalifyMonths,
    });
  }

  const seed = machine.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) || 1;
  const faults = coerceFaults(cfg.faultLibrary) ?? buildDefaultFaults(seed);

  return {
    machineId: machine.id,
    machineName: machine.name,
    productName: cfg.productName || 'Paracetamol 500mg',
    batchSize: cfg.batchSize || 400000,
    requalifyMonths: machine.requalifyMonths,
    targets: {
      weight: cfg.targetWeight,
      hardness: cfg.targetHardness,
      thickness: cfg.targetThickness,
      lod: cfg.targetLOD,
      weightGain: cfg.targetWeightGain,
    },
    dispensingFormula: DISPENSING_FORMULA.map((m) => ({ ...m })),
    coatingFormula: COATING_FORMULA.map((m) => ({ ...m })),
    faults,
  };
}
