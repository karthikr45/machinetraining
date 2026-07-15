import type { Fault, FaultResult, StageKey } from './types';

/**
 * Complete fault library — 30 faults across the 6 simulation stages.
 * Each fault carries GMP references, correct response, and scoring.
 */
export const faultLibrary: Record<StageKey, Fault[]> = {
  dispensing: [
    {
      id: 'DISP-001',
      stage: 'dispensing',
      title: 'Weighing balance calibration failure',
      description: 'Weighing balance showing E-ERROR — calibration failure detected.',
      severity: 'HIGH',
      options: ['Recalibrate balance', 'Use backup balance', 'Call engineer', 'Continue weighing'],
      correctAnswer: 0,
      explanation:
        'A balance showing calibration error must be recalibrated with certified weights before use. Continuing risks inaccurate dispensing.',
      gmpReference: 'Schedule M 3.4.2 / 21 CFR 211.68',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'DISP-002',
      stage: 'dispensing',
      title: 'API quantity shortfall',
      description: 'API material received 195 kg instead of 200 kg.',
      severity: 'MEDIUM',
      options: [
        'Use 195 kg and document',
        'Reject and reorder',
        'Calculate adjusted batch with QA approval',
        'Call QA',
      ],
      correctAnswer: 2,
      explanation:
        'The batch may be adjusted proportionally to available API, but only with documented QA approval to maintain formula ratios.',
      gmpReference: 'Schedule M 5.2 / 21 CFR 211.101',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'DISP-003',
      stage: 'dispensing',
      title: 'Environmental humidity excursion',
      description: 'Dispensing area RH reads 72% (limit 45–65%).',
      severity: 'MEDIUM',
      options: [
        'Stop dispensing and restore RH before continuing',
        'Continue — humidity is not critical',
        'Increase AC only',
        'Dispense faster',
      ],
      correctAnswer: 0,
      explanation:
        'Hygroscopic materials must be dispensed within the qualified RH range. Halt and restore environmental controls, log the deviation.',
      gmpReference: 'Schedule M 4.3 (Premises & environment)',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'DISP-004',
      stage: 'dispensing',
      title: 'Unlabelled container',
      description: 'A dispensed excipient container has no batch label.',
      severity: 'HIGH',
      options: [
        'Quarantine and verify against dispensing record before use',
        'Assume it is correct and use it',
        'Relabel from memory',
        'Discard immediately',
      ],
      correctAnswer: 0,
      explanation:
        'Unidentified material must be quarantined and reconciled to the dispensing record; traceability cannot be assumed.',
      gmpReference: 'Schedule M 5.4 (Labelling & traceability)',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'DISP-005',
      stage: 'dispensing',
      title: 'Static discharge during powder transfer',
      description: 'Visible static during transfer of fine powder near equipment.',
      severity: 'MEDIUM',
      options: [
        'Ensure equipment earthing/bonding is connected, then proceed',
        'Continue — static is harmless',
        'Spray water on powder',
        'Increase transfer speed',
      ],
      correctAnswer: 0,
      explanation:
        'Verify grounding/bonding to prevent electrostatic hazards and dosing errors before continuing.',
      gmpReference: 'Schedule M 4.5 (Safety) / GMP EHS',
      deviationRequired: false,
      points: 5,
    },
  ],
  granulation: [
    {
      id: 'GRAN-001',
      stage: 'granulation',
      title: 'Impeller overload alarm',
      description: 'Impeller stopped — overload alarm triggered during wet mixing.',
      severity: 'HIGH',
      options: [
        'Reduce load and restart',
        'Continue with chopper only',
        'Call maintenance',
        'Stop batch',
      ],
      correctAnswer: 0,
      explanation:
        'Reduce the bowl load to relieve the overload, then restart the impeller per SOP. This preserves the batch and equipment.',
      gmpReference: 'SOP-GRAN-001 / Schedule M 6.1',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'GRAN-002',
      stage: 'granulation',
      title: 'Binder pump blockage',
      description: 'Binder pump blocked — solution flow stopped mid-addition.',
      severity: 'HIGH',
      options: [
        'Stop granulation and clear blockage per SOP',
        'Increase pump pressure',
        'Add binder manually',
        'Reduce binder amount',
      ],
      correctAnswer: 0,
      explanation:
        'Stop the process, clear the blockage per SOP, and document. Forcing pressure or manual addition compromises granule uniformity.',
      gmpReference: 'SOP-GRAN-001 §7.2',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'GRAN-003',
      stage: 'granulation',
      title: 'LOD out of specification after drying',
      description: 'LOD result 5.8% after extended drying (limit ≤ 3%).',
      severity: 'MEDIUM',
      options: [
        'Continue drying further',
        'Reject granules',
        'Consult QA and document',
        'Dry at higher temperature',
      ],
      correctAnswer: 2,
      explanation:
        'Persistent OOS LOD requires QA consultation and a documented decision; unilaterally increasing temperature can degrade the API.',
      gmpReference: 'Schedule M 6.3 / OOS SOP',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'GRAN-004',
      stage: 'granulation',
      title: 'Chopper failure',
      description: 'Chopper motor tripped during high-shear granulation.',
      severity: 'MEDIUM',
      options: [
        'Stop, log deviation and inspect chopper before restart',
        'Continue with impeller only for full time',
        'Bypass chopper interlock',
        'Ignore — not critical',
      ],
      correctAnswer: 0,
      explanation:
        'Stop and inspect; running without the chopper changes granule size distribution and must not be bypassed.',
      gmpReference: 'SOP-GRAN-001 §6.4',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'GRAN-005',
      stage: 'granulation',
      title: 'Over-granulation (over-wetting)',
      description: 'Granules appear over-wetted / dough-like after binder addition.',
      severity: 'MEDIUM',
      options: [
        'Stop binder, evaluate with QA, adjust drying and document',
        'Add more dry powder to compensate',
        'Continue adding binder',
        'Proceed directly to compression',
      ],
      correctAnswer: 0,
      explanation:
        'Over-wetting affects compressibility. Stop binder addition, assess with QA and adjust the process with documentation.',
      gmpReference: 'Schedule M 6.2',
      deviationRequired: true,
      points: 5,
    },
  ],
  compression: [
    {
      id: 'COMP-001',
      stage: 'compression',
      title: 'Capping detected',
      description: 'CAPPING DETECTED — tablets splitting at the crown.',
      severity: 'HIGH',
      options: [
        'Reduce compression force and check pre-compression',
        'Increase compression force',
        'Continue and monitor',
        'Add more lubricant',
      ],
      correctAnswer: 0,
      explanation:
        'Capping is usually caused by air entrapment / excessive main force. Reduce force and increase pre-compression to de-aerate.',
      gmpReference: 'SOP-COMP-001 §8.1',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COMP-002',
      stage: 'compression',
      title: 'Weight variation alert',
      description: 'WEIGHT VARIATION ALERT — CV 3.2% (limit 2%).',
      severity: 'HIGH',
      options: [
        'Stop machine — check granule flow and feeder',
        'Increase turret speed',
        'Reduce compression force',
        'Continue monitoring',
      ],
      correctAnswer: 0,
      explanation:
        'High weight CV points to inconsistent die fill. Stop and investigate granule flow and feeder before proceeding.',
      gmpReference: 'SOP-COMP-001 §8.3 / IP weight uniformity',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COMP-003',
      stage: 'compression',
      title: 'Sticking to punch faces',
      description: 'STICKING TO PUNCH FACES observed on tablet surfaces.',
      severity: 'MEDIUM',
      options: [
        'Check moisture content and apply Mg stearate',
        'Increase compression speed',
        'Change punch tooling immediately',
        'Add more binder',
      ],
      correctAnswer: 0,
      explanation:
        'Sticking is typically excess moisture / insufficient lubrication. Verify LOD and lubrication before other actions.',
      gmpReference: 'SOP-COMP-001 §8.2',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COMP-004',
      stage: 'compression',
      title: 'High machine vibration',
      description: 'MACHINE VIBRATION HIGH ALERT during compression.',
      severity: 'HIGH',
      options: [
        'Reduce speed and check tooling alignment',
        'Increase speed to power through',
        'Stop and call maintenance',
        'Ignore — normal for this machine',
      ],
      correctAnswer: 0,
      explanation:
        'Reduce speed and check tooling / turret alignment. Vibration indicates a mechanical issue that damages tooling if ignored.',
      gmpReference: 'SOP-COMP-001 §5.4',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COMP-005',
      stage: 'compression',
      title: 'Hopper empty mid-batch',
      description: 'HOPPER EMPTY — 50,000 tablets remaining to produce.',
      severity: 'MEDIUM',
      options: [
        'Refill per SOP and document interruption',
        'Stop batch — cannot continue',
        'Use any available granules',
        'Reduce speed to use remaining',
      ],
      correctAnswer: 0,
      explanation:
        'Refill from the same qualified granule lot per SOP and document the interruption; never substitute unqualified granules.',
      gmpReference: 'SOP-COMP-001 §7.5',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COMP-006',
      stage: 'compression',
      title: 'Hardness dropping',
      description: 'HARDNESS DROPPING — average 4.1 kP (spec 5–8 kP).',
      severity: 'MEDIUM',
      options: [
        'Increase main compression force gradually',
        'Stop production immediately',
        'Reduce turret speed only',
        'Check and replace punches',
      ],
      correctAnswer: 0,
      explanation:
        'Gradually increase main compression force to bring hardness into spec while monitoring other attributes.',
      gmpReference: 'SOP-COMP-001 §8.5',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COMP-007',
      stage: 'compression',
      title: 'Metal contamination alarm',
      description: 'Metal detector rejected multiple tablets — possible tooling fragment.',
      severity: 'CRITICAL',
      options: [
        'Stop machine, quarantine affected tablets, inspect tooling',
        'Bypass metal detector',
        'Continue — false alarm likely',
        'Increase reject threshold',
      ],
      correctAnswer: 0,
      explanation:
        'A metal contamination signal is a critical safety event: stop, quarantine, inspect tooling and investigate before resuming.',
      gmpReference: 'Schedule M 6.5 / 21 CFR 211.65',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COMP-008',
      stage: 'compression',
      title: 'Pre-compression force out of range',
      description: 'Pre-compression force reads 1.2 kN (target ~5 kN).',
      severity: 'MEDIUM',
      options: [
        'Stop, re-set pre-compression per BMR and verify',
        'Ignore — only main force matters',
        'Increase turret speed',
        'Reduce feeder speed',
      ],
      correctAnswer: 0,
      explanation:
        'Correct pre-compression de-aerates granules and prevents capping. Reset to the BMR value and verify before running.',
      gmpReference: 'SOP-COMP-001 §5.2',
      deviationRequired: true,
      points: 5,
    },
  ],
  coating: [
    {
      id: 'COAT-001',
      stage: 'coating',
      title: 'Spray nozzle blockage',
      description: 'Spray nozzle blocked — weight gain stopped.',
      severity: 'MEDIUM',
      options: [
        'Stop spray and clean nozzle per SOP',
        'Increase spray pressure',
        'Replace nozzle immediately',
        'Continue with remaining nozzles',
      ],
      correctAnswer: 0,
      explanation:
        'Stop spraying and clean the nozzle per SOP to restore uniform coating; forcing pressure causes over-wetting.',
      gmpReference: 'SOP-COAT-001 §7.3',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COAT-002',
      stage: 'coating',
      title: 'Outlet temperature spike',
      description: 'Outlet temperature spike — 55°C detected (target ~42°C).',
      severity: 'MEDIUM',
      options: [
        'Reduce inlet temp and increase pan speed',
        'Stop coating immediately',
        'Increase spray rate to cool',
        'Open exhaust damper only',
      ],
      correctAnswer: 0,
      explanation:
        'Lower inlet temperature and increase pan speed to restore the thermal balance and prevent film defects.',
      gmpReference: 'SOP-COAT-001 §6.2',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COAT-003',
      stage: 'coating',
      title: 'Logo bridging',
      description: 'Logo bridging observed on 15% of tablets.',
      severity: 'MEDIUM',
      options: [
        'Reduce spray rate and increase drying time',
        'Stop and re-coat all tablets',
        'Increase pan speed only',
        'Increase atomization pressure',
      ],
      correctAnswer: 0,
      explanation:
        'Bridging is caused by too-fast film build. Reduce spray rate and improve drying to sharpen the debossing.',
      gmpReference: 'SOP-COAT-001 §8.1',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COAT-004',
      stage: 'coating',
      title: 'Tablet twinning / picking',
      description: 'Tablets sticking together (twinning) at high spray rate.',
      severity: 'MEDIUM',
      options: [
        'Reduce spray rate, increase inlet air / pan speed',
        'Add more solution',
        'Stop and discard batch',
        'Lower pan speed',
      ],
      correctAnswer: 0,
      explanation:
        'Twinning results from over-wetting. Reduce spray rate and improve drying and pan movement.',
      gmpReference: 'SOP-COAT-001 §8.2',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'COAT-005',
      stage: 'coating',
      title: 'Colour variation between sub-batches',
      description: 'Sub-batch 2 shows visible colour difference from sub-batch 1.',
      severity: 'MEDIUM',
      options: [
        'Stop, verify solution homogeneity and parameters, document',
        'Blend both sub-batches together',
        'Ship as-is',
        'Increase colour lake quantity mid-run',
      ],
      correctAnswer: 0,
      explanation:
        'Investigate solution mixing and process parameters; colour uniformity is a critical appearance attribute.',
      gmpReference: 'Schedule M 6.4',
      deviationRequired: true,
      points: 5,
    },
  ],
  qc: [
    {
      id: 'QC-001',
      stage: 'qc',
      title: 'Assay OOS result',
      description: 'Assay result 92.1% (spec 95.0–105.0%) — out of specification.',
      severity: 'CRITICAL',
      options: [
        'Invalidate result without investigation',
        'Phase 1: review raw data and re-test same sample',
        'Release batch anyway',
        'Reject batch immediately',
      ],
      correctAnswer: 1,
      explanation:
        'An OOS triggers a Phase 1 laboratory investigation (data review, possible retest) before any batch disposition decision.',
      gmpReference: 'OOS SOP / 21 CFR 211.192',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'QC-002',
      stage: 'qc',
      title: 'Dissolution below Q',
      description: 'Dissolution at 45 min = 74% (Q = 80%).',
      severity: 'HIGH',
      options: [
        'Initiate OOS and test additional units per stage S1/S2',
        'Average with a passing tablet',
        'Release the batch',
        'Discard the result',
      ],
      correctAnswer: 0,
      explanation:
        'Dissolution below Q requires staged testing (S1→S2→S3) under an OOS investigation, not averaging or discarding.',
      gmpReference: 'IP Dissolution / OOS SOP',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'QC-003',
      stage: 'qc',
      title: 'Weight uniformity failure',
      description: 'Two tablets exceed ±5% weight deviation in the sample.',
      severity: 'HIGH',
      options: [
        'Hold batch and investigate compression uniformity',
        'Replace failing tablets in the sample',
        'Pass — within count tolerance',
        'Re-weigh until they pass',
      ],
      correctAnswer: 0,
      explanation:
        'Hold the batch and trace the root cause to the compression step; sample data must never be manipulated.',
      gmpReference: 'IP Uniformity of Weight',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'QC-004',
      stage: 'qc',
      title: 'Wrong AQL sample size',
      description: 'Operator drew 80 units for a 400,000 batch instead of the required n.',
      severity: 'MEDIUM',
      options: [
        'Re-draw the correct AQL Level II sample size (n=200)',
        'Proceed with 80 units',
        'Use 500 units to be safe',
        'Skip sampling',
      ],
      correctAnswer: 0,
      explanation:
        'Sampling must follow the defined AQL plan; an incorrect sample size invalidates the inspection.',
      gmpReference: 'IS 2500 / AQL sampling plan',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'QC-005',
      stage: 'qc',
      title: 'Disintegration borderline',
      description: 'Disintegration 14.5 min (limit NMT 15 min) — one unit at 16 min.',
      severity: 'MEDIUM',
      options: [
        'Repeat test with 12 additional units per pharmacopoeia',
        'Pass — mean is within limit',
        'Fail the batch immediately',
        'Ignore the outlier unit',
      ],
      correctAnswer: 0,
      explanation:
        'If any unit fails, the pharmacopoeial test requires repeating with additional units before a conclusion.',
      gmpReference: 'IP Disintegration Test',
      deviationRequired: true,
      points: 5,
    },
  ],
  bmr: [
    {
      id: 'BMR-001',
      stage: 'bmr',
      title: 'Unconfirmed deviation in record',
      description: 'A logged deviation is left unconfirmed in the BMR.',
      severity: 'HIGH',
      options: [
        'Review, confirm and document impact before signing',
        'Sign anyway to save time',
        'Delete the deviation entry',
        'Leave it blank',
      ],
      correctAnswer: 0,
      explanation:
        'Every deviation must be reviewed, confirmed and impact-assessed before the BMR is signed (Complete + Accurate).',
      gmpReference: 'Schedule M 6.6 / 21 CFR 211.188',
      deviationRequired: false,
      points: 5,
    },
    {
      id: 'BMR-002',
      stage: 'bmr',
      title: 'Yield outside limit',
      description: 'Yield reconciliation shows 96.2% (alert limit 98%).',
      severity: 'MEDIUM',
      options: [
        'Investigate yield loss and document justification',
        'Round up to 98%',
        'Ignore — close to limit',
        'Re-enter theoretical yield',
      ],
      correctAnswer: 0,
      explanation:
        'A yield outside limits requires investigation and a documented, justified conclusion, never data manipulation.',
      gmpReference: '21 CFR 211.192 (Yield reconciliation)',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'BMR-003',
      stage: 'bmr',
      title: 'Back-dated entry request',
      description: 'A supervisor asks to back-date a missed in-process entry.',
      severity: 'CRITICAL',
      options: [
        'Refuse and make a contemporaneous late-entry note',
        'Back-date as requested',
        'Estimate the value',
        'Leave the entry blank',
      ],
      correctAnswer: 0,
      explanation:
        'Back-dating violates ALCOA+ Contemporaneous. Record a dated late-entry note explaining the delay.',
      gmpReference: 'ALCOA+ / 21 CFR Part 11',
      deviationRequired: true,
      points: 5,
    },
    {
      id: 'BMR-004',
      stage: 'bmr',
      title: 'Missing signature on a section',
      description: 'Compression section lacks the operator signature.',
      severity: 'MEDIUM',
      options: [
        'Obtain the responsible operator signature before release',
        'Sign on their behalf',
        'Release without it',
        'Add an initial only',
      ],
      correctAnswer: 0,
      explanation:
        'Signatures must be Attributable to the person who performed the work; never sign on behalf of another.',
      gmpReference: '21 CFR Part 11 / Schedule M 3.2',
      deviationRequired: false,
      points: 5,
    },
  ],
};

/** Deterministic-ish selection of `count` faults for a stage using a seed. */
export function getRandomFaults(stage: StageKey, count: number, seed = 1): Fault[] {
  const pool = faultLibrary[stage] ?? [];
  if (pool.length <= count) return [...pool];
  const scored = pool
    .map((f, i) => ({ f, r: Math.abs(Math.sin(seed + i * 7.13)) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, count)
    .map((x) => x.f);
  return scored;
}

export function getFaultById(id: string): Fault | undefined {
  for (const stage of Object.keys(faultLibrary) as StageKey[]) {
    const found = faultLibrary[stage].find((f) => f.id === id);
    if (found) return found;
  }
  return undefined;
}

export function evaluateFaultResponse(faultId: string, selectedOption: number): FaultResult {
  const fault = getFaultById(faultId);
  if (!fault) {
    return { correct: false, pointsAwarded: 0, explanation: 'Unknown fault', correctAnswer: -1 };
  }
  const correct = selectedOption === fault.correctAnswer;
  return {
    correct,
    pointsAwarded: correct ? fault.points : -5,
    explanation: fault.explanation,
    correctAnswer: fault.correctAnswer,
  };
}

export function totalFaultCount(): number {
  return (Object.keys(faultLibrary) as StageKey[]).reduce(
    (n, s) => n + faultLibrary[s].length,
    0
  );
}
