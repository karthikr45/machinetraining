import { prisma } from './prisma';
import { addMonths } from './utils';
import type {
  InspectionResult,
  InspectionQuestionResult,
  ReadinessScore,
} from './types';

export interface InspectionQuestionDef {
  id: number;
  question: string;
  category: string;
  evaluationCriteria: string[];
}

export const inspectionQuestions: InspectionQuestionDef[] = [
  {
    id: 1,
    question: 'Show me the training records for all operators who operated the Tablet Press in the last 6 months.',
    category: 'Training Records',
    evaluationCriteria: ['records_exist', 'signatures_present', 'scores_above_75'],
  },
  {
    id: 2,
    question: 'Who was qualified to operate the coating pan on the date of the last coating batch?',
    category: 'Qualification',
    evaluationCriteria: ['qualification_dated', 'certificate_present', 'ojt_signed'],
  },
  {
    id: 3,
    question: 'Show me your requalification records. Are there any operators with expired certifications?',
    category: 'Requalification',
    evaluationCriteria: ['no_expired', 'requalification_tracked'],
  },
  {
    id: 4,
    question: 'Show me the CAPA raised after your last training failure. What was the outcome?',
    category: 'CAPA Documentation',
    evaluationCriteria: ['capa_linked', 'capa_closed', 'effectiveness_checked'],
  },
  {
    id: 5,
    question: 'Show me the audit trail for a batch BMR. Who made entries and when?',
    category: 'Audit Trail',
    evaluationCriteria: ['attributable', 'contemporaneous', 'complete'],
  },
  {
    id: 6,
    question: 'Are your training records linked to specific SOP versions?',
    category: 'SOP Version Control',
    evaluationCriteria: ['sop_version_traceable'],
  },
  {
    id: 7,
    question: 'Show me your trainer qualification records. Who is qualified to conduct OJT?',
    category: 'Trainer Competency',
    evaluationCriteria: ['trainers_documented'],
  },
  {
    id: 8,
    question: 'What is your procedure when an operator fails training 3 times?',
    category: 'Procedure Knowledge',
    evaluationCriteria: ['correct_answer'],
  },
];

function grade(passRatio: number): { grade: InspectionQuestionResult['grade']; level: InspectionQuestionResult['findingLevel'] } {
  if (passRatio >= 0.99) return { grade: 'COMPLETE', level: 'NONE' };
  if (passRatio >= 0.6) return { grade: 'GAPS', level: 'MINOR' };
  return { grade: 'MISSING', level: 'MAJOR' };
}

export async function runMockInspection(companyId: string): Promise<InspectionResult> {
  const sixMonthsAgo = addMonths(new Date(), -6);
  const now = new Date();

  const [
    recentTraining,
    signedTraining,
    highScore,
    ojtSigned,
    expired,
    capaLinked,
    capaClosed,
    auditCount,
    sopLinked,
    trainers,
  ] = await Promise.all([
    prisma.trainingRecord.count({
      where: { user: { companyId }, status: 'COMPLETED', completedAt: { gte: sixMonthsAgo } },
    }),
    prisma.trainingRecord.count({
      where: { user: { companyId }, status: 'COMPLETED', signedAt: { not: null } },
    }),
    prisma.trainingRecord.count({
      where: { user: { companyId }, status: 'COMPLETED', score: { gte: 75 } },
    }),
    prisma.oJTRecord.count({ where: { machine: { companyId }, locked: true } }),
    prisma.trainingRecord.count({ where: { user: { companyId }, status: 'EXPIRED' } }),
    prisma.cAPA.count({ where: { companyId, trainingRecords: { some: {} } } }),
    prisma.cAPA.count({ where: { companyId, status: 'CLOSED' } }),
    prisma.auditLog.count({ where: { user: { companyId } } }),
    prisma.trainingRecord.count({ where: { user: { companyId }, sopDocumentId: { not: null } } }),
    prisma.user.count({ where: { companyId, isTrainer: true } }),
  ]);

  const totalCompleted = await prisma.trainingRecord.count({
    where: { user: { companyId }, status: 'COMPLETED' },
  });

  const questions: InspectionQuestionResult[] = [];

  // Q1
  {
    const ratio = recentTraining > 0 ? (signedTraining > 0 && highScore > 0 ? 1 : 0.6) : 0.3;
    const g = grade(ratio);
    questions.push({
      id: 1, question: inspectionQuestions[0].question, category: 'Training Records',
      evidence: { recentTraining, signedTraining, highScore },
      grade: g.grade, findingLevel: g.level,
      finding: g.grade !== 'COMPLETE' ? 'Some training records lack signatures or passing scores.' : undefined,
      recommendation: g.grade !== 'COMPLETE' ? 'Ensure all operator records are signed with scores ≥ 75%.' : undefined,
    });
  }
  // Q2
  {
    const ratio = ojtSigned > 0 ? 1 : 0.4;
    const g = grade(ratio);
    questions.push({
      id: 2, question: inspectionQuestions[1].question, category: 'Qualification',
      evidence: { ojtSigned }, grade: g.grade, findingLevel: g.level,
      finding: g.grade !== 'COMPLETE' ? 'OJT sign-off records incomplete.' : undefined,
      recommendation: g.grade !== 'COMPLETE' ? 'Complete dual-signed OJT for all coating operators.' : undefined,
    });
  }
  // Q3 — expired certs is a critical finding
  {
    const g: { grade: InspectionQuestionResult['grade']; level: InspectionQuestionResult['findingLevel'] } =
      expired === 0 ? { grade: 'COMPLETE', level: 'NONE' } : { grade: 'GAPS', level: 'CRITICAL' };
    questions.push({
      id: 3, question: inspectionQuestions[2].question, category: 'Requalification',
      evidence: { expired }, grade: g.grade, findingLevel: g.level,
      finding: expired > 0 ? `${expired} operator(s) have expired certifications.` : undefined,
      recommendation: expired > 0 ? 'Immediately assign requalification to all expired operators.' : undefined,
    });
  }
  // Q4
  {
    const ratio = capaLinked > 0 ? (capaClosed > 0 ? 1 : 0.6) : 0.4;
    const g = grade(ratio);
    questions.push({
      id: 4, question: inspectionQuestions[3].question, category: 'CAPA Documentation',
      evidence: { capaLinked, capaClosed }, grade: g.grade, findingLevel: g.level,
      finding: g.grade !== 'COMPLETE' ? 'CAPA effectiveness follow-up needs documentation.' : undefined,
      recommendation: g.grade !== 'COMPLETE' ? 'Document effectiveness checks on closed training CAPAs.' : undefined,
    });
  }
  // Q5
  {
    const ratio = auditCount > 0 ? 1 : 0;
    const g = grade(ratio);
    questions.push({
      id: 5, question: inspectionQuestions[4].question, category: 'Audit Trail',
      evidence: { auditCount }, grade: g.grade, findingLevel: g.level,
      finding: g.grade !== 'COMPLETE' ? 'Audit trail sparse.' : undefined,
    });
  }
  // Q6
  {
    const ratio = totalCompleted > 0 ? sopLinked / Math.max(1, totalCompleted) : 0;
    const g = grade(ratio);
    questions.push({
      id: 6, question: inspectionQuestions[5].question, category: 'SOP Version Control',
      evidence: { sopLinked, totalCompleted }, grade: g.grade, findingLevel: g.level,
      finding: g.grade !== 'COMPLETE' ? 'Not all training records reference an SOP version.' : undefined,
      recommendation: g.grade !== 'COMPLETE' ? 'Link every training record to its SOP version.' : undefined,
    });
  }
  // Q7
  {
    const ratio = trainers > 0 ? 1 : 0;
    const g = grade(ratio);
    questions.push({
      id: 7, question: inspectionQuestions[6].question, category: 'Trainer Competency',
      evidence: { trainers }, grade: g.grade, findingLevel: g.level,
      finding: g.grade !== 'COMPLETE' ? 'No qualified trainers documented.' : undefined,
    });
  }
  // Q8 — procedural answer (assumed correct if platform enforces it)
  {
    questions.push({
      id: 8, question: inspectionQuestions[7].question, category: 'Procedure Knowledge',
      evidence: { correctProcedure: 'CAPA + supervisor review + additional coaching' },
      grade: 'COMPLETE', findingLevel: 'NONE',
    });
  }

  const readiness = await calculateReadinessScore(companyId);

  const criticalCount = questions.filter((q) => q.findingLevel === 'CRITICAL').length;
  const majorCount = questions.filter((q) => q.findingLevel === 'MAJOR').length;
  let overallGrade: InspectionResult['grade'] = 'READY';
  if (criticalCount > 0 || readiness.overall < 65) overallGrade = 'NOT_READY';
  else if (majorCount > 0 || readiness.overall < 85) overallGrade = 'NEEDS_IMPROVEMENT';

  return {
    readiness,
    questions,
    grade: overallGrade,
    summary: `Mock inspection completed with ${criticalCount} critical, ${majorCount} major finding(s). Overall readiness ${readiness.overall}%.`,
  };
}

export async function calculateReadinessScore(companyId: string): Promise<ReadinessScore> {
  const now = new Date();
  const [
    totalTraining, signedTraining,
    totalCapa, closedCapa,
    totalReq, expiredReq,
    auditCount,
    totalCompleted, sopLinked,
  ] = await Promise.all([
    prisma.trainingRecord.count({ where: { user: { companyId }, status: 'COMPLETED' } }),
    prisma.trainingRecord.count({ where: { user: { companyId }, status: 'COMPLETED', signedAt: { not: null } } }),
    prisma.cAPA.count({ where: { companyId } }),
    prisma.cAPA.count({ where: { companyId, status: 'CLOSED' } }),
    prisma.trainingRecord.count({ where: { user: { companyId }, moduleId: null } }),
    prisma.trainingRecord.count({ where: { user: { companyId }, status: 'EXPIRED' } }),
    prisma.auditLog.count({ where: { user: { companyId } } }),
    prisma.trainingRecord.count({ where: { user: { companyId }, status: 'COMPLETED' } }),
    prisma.trainingRecord.count({ where: { user: { companyId }, sopDocumentId: { not: null } } }),
  ]);

  const pct = (num: number, den: number) => (den === 0 ? 100 : Math.round((num / den) * 100));

  const categories = [
    { name: 'Training Records', score: pct(signedTraining, totalTraining) },
    { name: 'CAPA Documentation', score: totalCapa === 0 ? 80 : pct(closedCapa, totalCapa) },
    { name: 'Requalification', score: totalReq === 0 ? 100 : Math.max(0, 100 - pct(expiredReq, totalReq)) },
    { name: 'Audit Trail', score: auditCount > 20 ? 95 : Math.min(95, auditCount * 4) },
    { name: 'SOP Version Control', score: pct(sopLinked, totalCompleted) },
  ];
  void now;
  const overall = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);
  return { overall, categories };
}

export function generateInspectionReport(results: InspectionResult) {
  const findings = results.questions.filter((q) => q.findingLevel !== 'NONE');
  return {
    grade: results.grade,
    overall: results.readiness.overall,
    findings: findings.map((f) => ({
      level: f.findingLevel,
      category: f.category,
      description: f.finding ?? 'Finding',
      recommendation: f.recommendation ?? 'Review and remediate.',
    })),
    categories: results.readiness.categories,
    summary: results.summary,
  };
}
