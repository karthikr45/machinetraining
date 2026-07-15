import type { RegulatoryFramework } from '@prisma/client';

/** Human-readable labels for each regulatory framework. */
export const REGULATORY_LABELS: Record<RegulatoryFramework, string> = {
  FDA_21_CFR: 'FDA 21 CFR Part 11',
  EU_GMP: 'EU GMP',
  WHO_GMP: 'WHO GMP',
  SCHEDULE_M: 'Schedule M (India)',
  HACCP: 'HACCP',
  ISO_9001: 'ISO 9001',
  IATF_16949: 'IATF 16949',
};
