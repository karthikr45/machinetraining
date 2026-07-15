import { prisma } from './prisma';

/** Indian GMP — Schedule M (Revised 2023/2024) key training-relevant requirements. */
export const scheduleMRequirements = {
  chapter1: {
    title: 'Pharmaceutical Quality System (PQS)',
    requirements: [
      '1.1 Quality management system established and documented',
      '1.2 CAPA system operational',
      '1.3 Deviation and change control managed',
      '1.4 Data integrity (ALCOA+) ensured',
    ],
  },
  chapter3: {
    title: 'Personnel',
    requirements: [
      '3.1 Training programme established',
      '3.2 Training records maintained',
      '3.3 Requalification frequency defined',
      '3.4 Trainer qualification documented',
      '3.5 Training effectiveness assessed',
    ],
  },
  chapter4: {
    title: 'Premises & Equipment',
    requirements: [
      '4.1 Equipment qualified and calibrated',
      '4.2 Environmental monitoring in place',
      '4.3 Cleaning and line clearance recorded',
    ],
  },
  chapter6: {
    title: 'Documentation & Records',
    requirements: [
      '6.1 Batch Manufacturing Records maintained',
      '6.2 SOPs current, approved and version-controlled',
      '6.3 Records contemporaneous and attributable',
      '6.4 Records retained and retrievable',
    ],
  },
  chapter9: {
    title: 'Quality Control',
    requirements: [
      '9.1 Sampling per approved plan (AQL)',
      '9.2 OOS investigations documented',
      '9.3 Batch release by authorised person',
    ],
  },
} as const;

export interface ScheduleMItemStatus {
  chapter: string;
  title: string;
  requirement: string;
  status: 'MET' | 'PARTIAL' | 'GAP';
  evidence: string;
}

export interface ScheduleMComplianceReport {
  companyId: string;
  overallPct: number;
  items: ScheduleMItemStatus[];
  metCount: number;
  partialCount: number;
  gapCount: number;
}

/** Evaluate Schedule M compliance from live platform data. */
export async function checkScheduleMCompliance(
  companyId: string
): Promise<ScheduleMComplianceReport> {
  const [
    trainingRecords,
    completedRecords,
    sopApproved,
    sopTotal,
    trainers,
    capas,
    auditLogs,
    machines,
    expiredRecords,
  ] = await Promise.all([
    prisma.trainingRecord.count({ where: { user: { companyId } } }),
    prisma.trainingRecord.count({ where: { user: { companyId }, status: 'COMPLETED' } }),
    prisma.sOPDocument.count({ where: { companyId, status: 'APPROVED' } }),
    prisma.sOPDocument.count({ where: { companyId } }),
    prisma.user.count({ where: { companyId, isTrainer: true } }),
    prisma.cAPA.count({ where: { companyId } }),
    prisma.auditLog.count({ where: { user: { companyId } } }),
    prisma.machine.count({ where: { companyId, requalifyMonths: { gt: 0 } } }),
    prisma.trainingRecord.count({ where: { user: { companyId }, status: 'EXPIRED' } }),
  ]);

  const items: ScheduleMItemStatus[] = [
    {
      chapter: '1', title: 'PQS', requirement: '1.2 CAPA system operational',
      status: capas > 0 ? 'MET' : 'GAP',
      evidence: `${capas} CAPA record(s)`,
    },
    {
      chapter: '1', title: 'PQS', requirement: '1.4 Data integrity (ALCOA+)',
      status: auditLogs > 0 ? 'MET' : 'GAP',
      evidence: `${auditLogs} immutable audit entries`,
    },
    {
      chapter: '3', title: 'Personnel', requirement: '3.1 Training programme established',
      status: trainingRecords > 0 ? 'MET' : 'GAP',
      evidence: `${trainingRecords} training records`,
    },
    {
      chapter: '3', title: 'Personnel', requirement: '3.2 Training records maintained',
      status: completedRecords > 0 ? 'MET' : 'PARTIAL',
      evidence: `${completedRecords} completed`,
    },
    {
      chapter: '3', title: 'Personnel', requirement: '3.3 Requalification frequency defined',
      status: machines > 0 ? 'MET' : 'GAP',
      evidence: `${machines} machines with requalification period`,
    },
    {
      chapter: '3', title: 'Personnel', requirement: '3.4 Trainer qualification documented',
      status: trainers > 0 ? 'MET' : 'GAP',
      evidence: `${trainers} qualified trainer(s)`,
    },
    {
      chapter: '3', title: 'Personnel', requirement: '3.5 Training effectiveness (no long-expired certs)',
      status: expiredRecords === 0 ? 'MET' : expiredRecords < 5 ? 'PARTIAL' : 'GAP',
      evidence: `${expiredRecords} expired certifications`,
    },
    {
      chapter: '6', title: 'Documentation', requirement: '6.2 SOPs approved & version-controlled',
      status: sopTotal === 0 ? 'GAP' : sopApproved === sopTotal ? 'MET' : 'PARTIAL',
      evidence: `${sopApproved}/${sopTotal} SOPs approved`,
    },
    {
      chapter: '6', title: 'Documentation', requirement: '6.3 Records contemporaneous & attributable',
      status: auditLogs > 0 ? 'MET' : 'GAP',
      evidence: 'Server-side ALCOA+ timestamps',
    },
  ];

  const metCount = items.filter((i) => i.status === 'MET').length;
  const partialCount = items.filter((i) => i.status === 'PARTIAL').length;
  const gapCount = items.filter((i) => i.status === 'GAP').length;
  const overallPct = Math.round(((metCount + partialCount * 0.5) / items.length) * 100);

  return { companyId, overallPct, items, metCount, partialCount, gapCount };
}
