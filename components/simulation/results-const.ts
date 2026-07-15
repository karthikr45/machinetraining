import { SIMULATION_STAGES as STAGES } from '@/lib/types';
import { PASS_THRESHOLD } from '@/lib/simulation-engine';
import type { StageKey } from '@/lib/types';

const SHORT: Record<StageKey, string> = {
  dispensing: 'Dispensing',
  granulation: 'Granulation',
  compression: 'Compression',
  coating: 'Coating',
  qc: 'QC',
  bmr: 'BMR',
};

export const SIMULATION_STAGES = STAGES.map((s) => ({
  key: s.key,
  title: s.title,
  short: SHORT[s.key],
  maxPoints: s.maxPoints,
  order: s.order,
}));

export const PASS_THRESHOLD_LABEL = `Pass mark ${PASS_THRESHOLD}/100`;

export { PASS_THRESHOLD };
