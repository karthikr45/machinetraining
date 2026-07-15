import type { Fault, FaultResponse, StageResult, StageKey } from '@/lib/types';
import type { SimConfigDTO } from '@/lib/simulation-shared';

/** Common props every stage component receives from the orchestrator. */
export interface StageProps {
  config: SimConfigDTO;
  faults: Fault[];
  onComplete: (result: StageResult, faultResponses: FaultResponse[]) => void;
}

/** Colour token for an in/out-of-spec value. */
export function specClass(withinSpec: boolean): string {
  return withinSpec ? 'text-pharma-success' : 'text-pharma-danger';
}

/** Build a StageResult with the max points looked up from the metadata. */
export function makeStageResult(
  stage: StageKey,
  maxPoints: number,
  score: number,
  data: Record<string, unknown>,
  deviations: StageResult['deviations'] = []
): StageResult {
  return {
    stage,
    score: Math.max(0, Math.min(maxPoints, Math.round(score * 10) / 10)),
    maxPoints,
    data,
    deviations,
  };
}
