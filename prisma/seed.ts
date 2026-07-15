import { PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faultLibrary } from '../lib/fault-library';
import { DISPENSING_FORMULA } from '../lib/simulation-engine';
import type { ModuleContent, QuizQuestion } from '../lib/types';

const prisma = new PrismaClient();

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function moduleContent(title: string, summary: string, sections: { heading: string; body: string; bullets?: string[] }[]): ModuleContent {
  return {
    summary,
    objectives: [
      `Understand the purpose and operation of ${title}`,
      'Follow the approved SOP and BMR at all times',
      'Perform in-process checks and document deviations correctly',
    ],
    sections,
    keyPoints: [
      'Always operate to the current SOP version',
      'Record all data contemporaneously (ALCOA+)',
      'Escalate any out-of-specification result to QA',
    ],
    safetyNotes: ['Ensure all guards and interlocks are in place before start-up'],
  };
}

function quizQuestions(topic: string): QuizQuestion[] {
  return [
    {
      id: 'q1',
      question: `What must be verified before starting the ${topic}?`,
      options: ['Line clearance and BMR availability', 'Only the power supply', 'Nothing — start immediately', 'Ask a colleague informally'],
      correctIndex: 0,
      explanation: 'Line clearance and BMR availability are mandatory pre-start checks under GMP.',
    },
    {
      id: 'q2',
      question: 'When should manufacturing data be recorded?',
      options: ['At the end of the shift', 'Contemporaneously, at the time of the activity', 'The next day', 'Only if asked by QA'],
      correctIndex: 1,
      explanation: 'ALCOA+ requires data to be contemporaneous — recorded at the time of the activity.',
    },
    {
      id: 'q3',
      question: 'What is the correct response to an out-of-specification result?',
      options: ['Ignore it', 'Adjust the result', 'Log a deviation and escalate to QA', 'Discard the batch quietly'],
      correctIndex: 2,
      explanation: 'OOS results must be documented as a deviation and investigated with QA.',
    },
    {
      id: 'q4',
      question: 'Who may sign a completed batch record entry?',
      options: ['Anyone available', 'The person who performed the activity', 'The supervisor only', 'The QA head only'],
      correctIndex: 1,
      explanation: 'Signatures must be attributable to the person who performed the work.',
    },
    {
      id: 'q5',
      question: 'What does a change in SOP version require for trained operators?',
      options: ['Nothing', 'Retraining/requalification on the new version', 'Only an email', 'A verbal briefing'],
      correctIndex: 1,
      explanation: 'A new SOP version triggers requalification of operators trained on the previous version.',
    },
  ];
}

async function main() {
  console.log('🌱 Seeding PharmaTrainX…');

  // Clean (order matters for FKs)
  await prisma.auditLog.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.electronicSignature.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.simulationRecord.deleteMany();
  await prisma.trainingRecord.deleteMany();
  await prisma.oJTRecord.deleteMany();
  await prisma.cAPA.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.trainingModule.deleteMany();
  await prisma.simulationConfig.deleteMany();
  await prisma.document.deleteMany();
  await prisma.sOPDocument.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const password = await bcrypt.hash('demo123', 12);

  // ---------- Companies ----------
  const sunPharma = await prisma.company.create({
    data: {
      name: 'SunPharma India Demo',
      industry: 'PHARMA',
      subscriptionPlan: 'ENTERPRISE',
      regulatoryFramework: 'SCHEDULE_M',
      address: 'Andheri East, Mumbai, Maharashtra',
      gstin: '27AABCS1234A1Z5',
      licenseNumber: 'MFG/MH/2019/00123',
    },
  });
  const nestle = await prisma.company.create({
    data: {
      name: 'Nestle India Demo',
      industry: 'FOOD_BEVERAGE',
      subscriptionPlan: 'PRO',
      regulatoryFramework: 'HACCP',
      address: 'Gurugram, Haryana',
    },
  });
  const tata = await prisma.company.create({
    data: {
      name: 'Tata Motors Demo',
      industry: 'AUTOMOTIVE',
      subscriptionPlan: 'BASIC',
      regulatoryFramework: 'ISO_9001',
      address: 'Pune, Maharashtra',
    },
  });
  void nestle;
  void tata;

  // ---------- Users (SunPharma) ----------
  const mk = (name: string, email: string, role: Role, department?: string, employeeId?: string, isTrainer = false) =>
    prisma.user.create({
      data: {
        name,
        email,
        password,
        role,
        department,
        employeeId,
        isTrainer,
        companyId: sunPharma.id,
        trainerQualifications: isTrainer
          ? { qualifiedMachines: ['Tablet Press', 'Granulator'], certifiedOn: new Date('2023-06-01').toISOString(), assessor: 'Head of Training' }
          : undefined,
      },
    });

  const admin = await mk('Vikram Mehta', 'admin@demo.com', 'ADMIN', 'Management', 'EMP-0001');
  const trainingManager = await mk('Sunita Rao', 'training.manager@demo.com', 'TRAINING_MANAGER', 'Training', 'EMP-0002');
  const operator1 = await mk('Rajesh Kumar', 'operator1@demo.com', 'OPERATOR', 'Compression', 'EMP-1001');
  const operator2 = await mk('Priya Sharma', 'operator2@demo.com', 'OPERATOR', 'Granulation', 'EMP-1002');
  const operator3 = await mk('Amit Patel', 'operator3@demo.com', 'OPERATOR', 'Coating', 'EMP-1003');
  const technician = await mk('Suresh Nair', 'technician@demo.com', 'TECHNICIAN', 'Engineering', 'EMP-2001');
  const qa = await mk('Neha Gupta', 'qa@demo.com', 'QA_OFFICER', 'Quality Assurance', 'EMP-3001');
  const trainer = await mk('Dr. Anjali Singh', 'trainer@demo.com', 'TRAINER', 'Training', 'EMP-4001', true);

  // Also a couple of extra users for other companies (so login scoping is real)
  await prisma.user.create({ data: { name: 'Nestle Admin', email: 'admin@nestle.demo', password, role: 'ADMIN', companyId: nestle.id } });
  await prisma.user.create({ data: { name: 'Tata Admin', email: 'admin@tata.demo', password, role: 'ADMIN', companyId: tata.id } });

  // ---------- Machines ----------
  const tabletPress = await prisma.machine.create({
    data: {
      companyId: sunPharma.id,
      name: 'Cadmach CMB-45 Tablet Press',
      type: 'Rotary Tablet Press',
      industry: 'PHARMA',
      manufacturer: 'Cadmach Machinery',
      modelNumber: 'CMB-45',
      yearOfMfg: 2021,
      location: 'Block B — Compression Room 2',
      description: '45-station rotary tablet press for high-speed compression of Paracetamol 500 mg tablets.',
      status: 'PUBLISHED',
      requalifyMonths: 12,
    },
  });
  const granulator = await prisma.machine.create({
    data: {
      companyId: sunPharma.id,
      name: 'Glatt GPCG-300 Granulator',
      type: 'Fluid Bed / High-Shear Granulator',
      industry: 'PHARMA',
      manufacturer: 'Glatt GmbH',
      modelNumber: 'GPCG-300',
      yearOfMfg: 2020,
      location: 'Block B — Granulation Room 1',
      description: 'High-shear wet granulation and fluid-bed drying system.',
      status: 'PUBLISHED',
      requalifyMonths: 12,
    },
  });
  const coatingPan = await prisma.machine.create({
    data: {
      companyId: sunPharma.id,
      name: 'Accela Cota 500L Coating Pan',
      type: 'Film Coating Pan',
      industry: 'PHARMA',
      manufacturer: 'Thomas Engineering',
      modelNumber: 'AC-500',
      yearOfMfg: 2022,
      location: 'Block B — Coating Room 1',
      description: 'Perforated film-coating pan, 500 L, for aqueous film coating.',
      status: 'DRAFT',
      requalifyMonths: 24,
    },
  });

  // ---------- Modules + Quizzes ----------
  const moduleDefs: { machineId: string; title: string; titleHi: string; type: any; order: number }[] = [
    { machineId: tabletPress.id, title: 'Tablet Press — Overview', titleHi: 'टैबलेट प्रेस — अवलोकन', type: 'OVERVIEW', order: 1 },
    { machineId: tabletPress.id, title: 'Tablet Press — Operation', titleHi: 'टैबलेट प्रेस — संचालन', type: 'OPERATION', order: 2 },
    { machineId: tabletPress.id, title: 'Tablet Press — Safety', titleHi: 'टैबलेट प्रेस — सुरक्षा', type: 'SAFETY', order: 3 },
    { machineId: tabletPress.id, title: 'Tablet Press — Maintenance', titleHi: 'टैबलेट प्रेस — रखरखाव', type: 'MAINTENANCE', order: 4 },
    { machineId: tabletPress.id, title: 'Tablet Press — GMP Compliance', titleHi: 'टैबलेट प्रेस — जीएमपी अनुपालन', type: 'COMPLIANCE', order: 5 },
    { machineId: granulator.id, title: 'Granulator — Overview', titleHi: 'ग्रैनुलेटर — अवलोकन', type: 'OVERVIEW', order: 1 },
    { machineId: granulator.id, title: 'Granulator — Operation', titleHi: 'ग्रैनुलेटर — संचालन', type: 'OPERATION', order: 2 },
    { machineId: granulator.id, title: 'Granulator — Safety', titleHi: 'ग्रैनुलेटर — सुरक्षा', type: 'SAFETY', order: 3 },
    { machineId: granulator.id, title: 'Granulator — Maintenance', titleHi: 'ग्रैनुलेटर — रखरखाव', type: 'MAINTENANCE', order: 4 },
    { machineId: granulator.id, title: 'Granulator — GMP Compliance', titleHi: 'ग्रैनुलेटर — जीएमपी अनुपालन', type: 'COMPLIANCE', order: 5 },
    { machineId: coatingPan.id, title: 'Coating Pan — Overview', titleHi: 'कोटिंग पैन — अवलोकन', type: 'OVERVIEW', order: 1 },
    { machineId: coatingPan.id, title: 'Coating Pan — Operation', titleHi: 'कोटिंग पैन — संचालन', type: 'OPERATION', order: 2 },
    { machineId: coatingPan.id, title: 'Coating Pan — Safety', titleHi: 'कोटिंग पैन — सुरक्षा', type: 'SAFETY', order: 3 },
  ];

  const createdModules: { id: string; machineId: string; order: number }[] = [];
  for (const m of moduleDefs) {
    const content = moduleContent(m.title, `${m.title} training covering principles, procedure, and GMP expectations.`, [
      { heading: 'Introduction', body: `This module introduces the ${m.title.split('—')[0].trim()} and its role in the manufacturing process.`, bullets: ['Purpose and components', 'Key process parameters', 'Critical quality attributes'] },
      { heading: 'Standard Operating Procedure', body: 'Operate strictly per the current approved SOP. Perform all pre-start checks, in-process checks, and complete the BMR contemporaneously.', bullets: ['Pre-start / line clearance', 'Parameter setup per BMR', 'In-process checks', 'Deviation handling'] },
      { heading: 'GMP & Data Integrity', body: 'All records must satisfy ALCOA+ principles. Sign entries attributably and never back-date.', bullets: ['Attributable', 'Contemporaneous', 'Accurate & Complete'] },
    ]);
    const mod = await prisma.trainingModule.create({
      data: {
        machineId: m.machineId,
        title: m.title,
        titleHi: m.titleHi,
        content: content as any,
        contentHi: content as any,
        moduleType: m.type,
        order: m.order,
        estimatedMinutes: 15,
        sopVersion: m.machineId === tabletPress.id ? '2.1' : m.machineId === granulator.id ? '1.3' : '1.0',
      },
    });
    createdModules.push({ id: mod.id, machineId: m.machineId, order: m.order });
    // Quiz on Operation + Compliance modules
    if (m.type === 'OPERATION' || m.type === 'COMPLIANCE') {
      await prisma.quiz.create({
        data: { moduleId: mod.id, questions: quizQuestions(m.title.split('—')[0].trim()) as any, passingScore: 75, maxAttempts: 3 },
      });
    }
  }

  // ---------- Simulation config (Tablet Press) ----------
  await prisma.simulationConfig.create({
    data: {
      machineId: tabletPress.id,
      batchSize: 400000,
      productName: 'Paracetamol 500mg',
      targetWeight: 500,
      targetHardness: 6.5,
      targetThickness: 3.5,
      targetLOD: 2.0,
      targetWeightGain: 3.0,
      stages: {
        dispensing: { materials: DISPENSING_FORMULA, envTemp: [20, 25], envRH: [45, 65] },
        granulation: { impellerRPM: 150, chopperRPM: 1500, dryMixMin: 10, binderKg: 20, waterL: 200, wetMixMin: 15 },
        compression: { turretRPM: 30, preComp: 5, mainComp: 18, feederRPM: 40, tabletWeight: 500 },
        coating: { inletC: 65, outletC: 42, panRPM: 8, sprayRate: 300, atomBar: 2.5, gunCm: 25 },
        qc: { aql: 'Level II', sampleN: 200 },
        bmr: { sections: 8 },
      } as any,
      faultLibrary: faultLibrary as any,
    },
  });

  // ---------- SOPs ----------
  const sopComp = await prisma.sOPDocument.create({
    data: {
      companyId: sunPharma.id,
      machineId: tabletPress.id,
      title: 'Compression Operation',
      sopNumber: 'SOP-COMP-001',
      version: '2.1',
      status: 'APPROVED',
      approvedBy: 'Sunita Rao',
      approvedAt: addDays(new Date(), -40),
      effectiveDate: addDays(new Date(), -35),
      reviewDate: addMonths(new Date(), 11),
      previousVersion: '2.0',
      changeReason: 'Annual review — updated in-process check frequency.',
      extractedText: 'SOP for operation of the rotary tablet press including line clearance, parameter setup, in-process checks and deviation handling.',
    },
  });
  await prisma.sOPDocument.create({
    data: {
      companyId: sunPharma.id,
      machineId: granulator.id,
      title: 'Granulation Operation',
      sopNumber: 'SOP-GRAN-001',
      version: '1.3',
      status: 'APPROVED',
      approvedBy: 'Sunita Rao',
      approvedAt: addDays(new Date(), -60),
      effectiveDate: addDays(new Date(), -55),
      reviewDate: addMonths(new Date(), 10),
      previousVersion: '1.2',
      changeReason: 'Updated LOD acceptance criteria.',
    },
  });
  await prisma.sOPDocument.create({
    data: {
      companyId: sunPharma.id,
      machineId: coatingPan.id,
      title: 'Coating Operation',
      sopNumber: 'SOP-COAT-001',
      version: '1.0',
      status: 'UNDER_REVIEW',
    },
  });

  // ---------- Training records ----------
  const tabletModules = createdModules.filter((m) => m.machineId === tabletPress.id).sort((a, b) => a.order - b.order);

  // Operator1: all Tablet Press modules complete, avg 85, expires in 6 months
  for (const mod of tabletModules) {
    await prisma.trainingRecord.create({
      data: {
        userId: operator1.id,
        machineId: tabletPress.id,
        moduleId: mod.id,
        sopDocumentId: sopComp.id,
        status: 'COMPLETED',
        score: 82 + Math.round((mod.order % 3) * 3),
        attempts: 1,
        startedAt: addDays(new Date(), -120),
        completedAt: addDays(new Date(), -118),
        expiresAt: addMonths(new Date(), 6),
        signature: 'Rajesh Kumar (e-sign)',
        signedAt: addDays(new Date(), -118),
        signedBy: operator1.id,
      },
    });
  }
  // Machine-level record for operator1
  await prisma.trainingRecord.create({
    data: {
      userId: operator1.id,
      machineId: tabletPress.id,
      status: 'COMPLETED',
      score: 85,
      attempts: 1,
      completedAt: addDays(new Date(), -118),
      expiresAt: addMonths(new Date(), 6),
      signedAt: addDays(new Date(), -118),
      signedBy: operator1.id,
    },
  });

  // Operator2: 2/5 modules complete, IN_PROGRESS
  const granModules = createdModules.filter((m) => m.machineId === granulator.id).sort((a, b) => a.order - b.order);
  await prisma.trainingRecord.create({
    data: { userId: operator2.id, machineId: granulator.id, moduleId: granModules[0].id, status: 'COMPLETED', score: 88, attempts: 1, completedAt: addDays(new Date(), -10), expiresAt: addMonths(new Date(), 12) },
  });
  await prisma.trainingRecord.create({
    data: { userId: operator2.id, machineId: granulator.id, moduleId: granModules[1].id, status: 'IN_PROGRESS', attempts: 0, startedAt: addDays(new Date(), -2) },
  });

  // Operator3: NOT_STARTED on coating + an EXPIRED certification (drives CAPA/requal demos)
  await prisma.trainingRecord.create({
    data: { userId: operator3.id, machineId: coatingPan.id, status: 'NOT_STARTED', attempts: 0 },
  });
  await prisma.trainingRecord.create({
    data: { userId: operator3.id, machineId: tabletPress.id, status: 'EXPIRED', score: 79, attempts: 1, completedAt: addDays(new Date(), -400), expiresAt: addDays(new Date(), -35) },
  });

  // ---------- OJT record (operator1, PASS, signed) ----------
  const checklist = [
    { id: 1, section: 'PRE-START CHECKS', text: 'Line clearance completed correctly', result: 'PASS', comment: '' },
    { id: 2, section: 'PRE-START CHECKS', text: 'BMR available at machine', result: 'PASS', comment: '' },
    { id: 3, section: 'PRE-START CHECKS', text: 'Correct tooling verified', result: 'PASS', comment: '' },
    { id: 4, section: 'PRE-START CHECKS', text: 'Hopper loading procedure followed', result: 'PASS', comment: '' },
    { id: 5, section: 'MACHINE OPERATION', text: 'Startup sequence performed correctly', result: 'PASS', comment: '' },
    { id: 6, section: 'MACHINE OPERATION', text: 'Initial parameters set as per BMR', result: 'PASS', comment: '' },
    { id: 7, section: 'MACHINE OPERATION', text: 'In-process check performed correctly', result: 'PASS', comment: '' },
    { id: 8, section: 'MACHINE OPERATION', text: 'Weight check procedure demonstrated', result: 'PASS', comment: '' },
    { id: 9, section: 'MACHINE OPERATION', text: 'Hardness check performed correctly', result: 'PASS', comment: '' },
    { id: 10, section: 'FAULT RESPONSE', text: 'Response to weight variation correct', result: 'PASS', comment: 'Stopped machine, checked feeder.' },
    { id: 11, section: 'FAULT RESPONSE', text: 'Machine stop procedure correct', result: 'PASS', comment: '' },
    { id: 12, section: 'FAULT RESPONSE', text: 'Deviation documentation correct', result: 'PASS', comment: '' },
    { id: 13, section: 'DOCUMENTATION', text: 'BMR entries made correctly', result: 'PASS', comment: '' },
    { id: 14, section: 'DOCUMENTATION', text: 'In-process records completed', result: 'PASS', comment: '' },
    { id: 15, section: 'DOCUMENTATION', text: 'Signature applied correctly', result: 'PASS', comment: '' },
  ];
  await prisma.oJTRecord.create({
    data: {
      traineeId: operator1.id,
      trainerId: trainer.id,
      machineId: tabletPress.id,
      sopVersion: '2.1',
      checklist: checklist as any,
      overallResult: 'PASS',
      trainerComments: 'Rajesh demonstrated competent, safe operation and correct documentation.',
      traineeComments: 'Understood the process and deviation handling.',
      trainerSignature: 'Dr. Anjali Singh (e-sign)',
      traineeSignature: 'Rajesh Kumar (e-sign)',
      trainerSignedAt: addDays(new Date(), -115),
      traineeSignedAt: addDays(new Date(), -115),
      locked: true,
    },
  });

  // ---------- CAPAs ----------
  const capaClosed = await prisma.cAPA.create({
    data: {
      companyId: sunPharma.id,
      capaNumber: 'CAPA-20240101-001',
      title: 'Repeated quiz failure — Rajesh Kumar (Tablet Press)',
      description: 'Operator failed the compression module quiz 3 times.',
      severity: 'MINOR',
      status: 'CLOSED',
      deviationType: 'PERSONNEL',
      rootCause: 'Insufficient understanding of in-process weight check limits.',
      immediateAction: 'One-to-one coaching by trainer.',
      preventiveAction: 'Added worked examples to the training module; retest scheduled.',
      ownerId: trainingManager.id,
      machineId: tabletPress.id,
      dueDate: addDays(new Date(), -100),
      closedAt: addDays(new Date(), -95),
      effectivenessCheck: 'Effective — operator passed within 30 days.',
      effectivenessDate: addDays(new Date(), -90),
      autoGenerated: true,
      triggerReason: 'QUIZ_FAILED_3_TIMES',
    },
  });
  const capaOpen = await prisma.cAPA.create({
    data: {
      companyId: sunPharma.id,
      capaNumber: 'CAPA-20240601-002',
      title: 'Expired certification — Amit Patel (Tablet Press)',
      description: 'Operator certification expired more than 30 days ago.',
      severity: 'MINOR',
      status: 'OPEN',
      deviationType: 'DOCUMENTATION_ERROR',
      ownerId: trainingManager.id,
      machineId: tabletPress.id,
      dueDate: addDays(new Date(), 5),
      autoGenerated: true,
      triggerReason: 'CERT_EXPIRED_30_DAYS',
    },
  });

  // ---------- Simulation records ----------
  const stageScoresFail = { dispensing: 12, granulation: 10, compression: 16, coating: 11, qc: 10, bmr: 9 };
  const stageScoresPass = { dispensing: 14, granulation: 13, compression: 22, coating: 13, qc: 13, bmr: 9 };
  await prisma.simulationRecord.create({
    data: {
      userId: operator1.id,
      machineId: tabletPress.id,
      batchNumber: 'BATCH-20240610-001',
      totalScore: 68,
      stageScores: stageScoresFail as any,
      faultsInjected: [{ id: 'COMP-002', stage: 'compression' }] as any,
      faultResponses: [{ faultId: 'COMP-002', selectedOption: 3, correct: false, pointsAwarded: -5 }] as any,
      bmrData: { batchNumber: 'BATCH-20240610-001', yieldPct: 97.8 } as any,
      status: 'FAILED',
      duration: 2640,
      passed: false,
      completedAt: addDays(new Date(), -20),
    },
  });
  await prisma.simulationRecord.create({
    data: {
      userId: operator1.id,
      machineId: tabletPress.id,
      batchNumber: 'BATCH-20240612-002',
      totalScore: 84,
      stageScores: stageScoresPass as any,
      faultsInjected: [{ id: 'COMP-002', stage: 'compression' }] as any,
      faultResponses: [{ faultId: 'COMP-002', selectedOption: 0, correct: true, pointsAwarded: 5 }] as any,
      bmrData: { batchNumber: 'BATCH-20240612-002', yieldPct: 99.1 } as any,
      status: 'PASSED',
      duration: 2400,
      passed: true,
      certificateUrl: '/api/simulation/certificate/seed',
      completedAt: addDays(new Date(), -18),
    },
  });
  await prisma.simulationRecord.create({
    data: {
      userId: operator2.id,
      machineId: tabletPress.id,
      batchNumber: 'BATCH-20240701-003',
      totalScore: 71,
      stageScores: { dispensing: 13, granulation: 12, compression: 17, coating: 11, qc: 11, bmr: 7 } as any,
      faultsInjected: [{ id: 'DISP-001', stage: 'dispensing' }] as any,
      faultResponses: [{ faultId: 'DISP-001', selectedOption: 3, correct: false, pointsAwarded: -5 }] as any,
      bmrData: { batchNumber: 'BATCH-20240701-003', yieldPct: 98.4 } as any,
      status: 'FAILED',
      duration: 2900,
      passed: false,
      completedAt: addDays(new Date(), -14),
    },
  });

  // ---------- Electronic signatures ----------
  await prisma.electronicSignature.create({
    data: { userId: operator1.id, recordType: 'OJTRecord', recordId: 'seed-ojt', meaning: 'Trainee acknowledgement', ipAddress: '192.168.1.5', signedAt: addDays(new Date(), -115) },
  });

  // ---------- Audit logs (50+) ----------
  const actors = [admin, trainingManager, operator1, operator2, operator3, technician, qa, trainer];
  const actions = ['LOGIN', 'COMPLETE', 'SIGN', 'CREATE', 'UPDATE', 'APPROVE', 'STATUS_CHANGE', 'EXPIRE'];
  const entities = ['TrainingRecord', 'SOPDocument', 'CAPA', 'OJTRecord', 'SimulationRecord', 'Machine', 'User'];
  const auditData = [];
  for (let i = 0; i < 56; i++) {
    const actor = actors[i % actors.length];
    const action = actions[i % actions.length];
    const entity = entities[i % entities.length];
    auditData.push({
      userId: actor.id,
      action,
      entityType: entity,
      entityId: `${entity.toLowerCase()}-${1000 + i}`,
      oldValue: action === 'STATUS_CHANGE' ? { status: 'OPEN' } : undefined,
      newValue: action === 'COMPLETE' ? { score: 80 + (i % 15) } : action === 'STATUS_CHANGE' ? { status: 'INVESTIGATION' } : { note: 'ok' },
      changeReason: action === 'APPROVE' ? 'Annual review update' : undefined,
      ipAddress: `192.168.1.${5 + (i % 20)}`,
      timestamp: addDays(new Date(), -(i % 60)),
    });
  }
  await prisma.auditLog.createMany({ data: auditData });

  // Link a couple of audit logs to specific records for the trail viewer
  await prisma.auditLog.create({
    data: { userId: operator1.id, action: 'SIGN', entityType: 'CAPA', entityId: capaClosed.id, capaId: capaClosed.id, newValue: { status: 'CLOSED' }, ipAddress: '192.168.1.5' },
  });
  await prisma.auditLog.create({
    data: { userId: trainingManager.id, action: 'CREATE', entityType: 'CAPA', entityId: capaOpen.id, capaId: capaOpen.id, changeReason: 'Auto-generated: CERT_EXPIRED_30_DAYS', ipAddress: '192.168.1.8' },
  });

  // ---------- Notifications ----------
  await prisma.notificationLog.createMany({
    data: [
      { userId: operator3.id, type: 'EXPIRY_WARNING', subject: 'Certification expired — Cadmach CMB-45 Tablet Press', message: 'Your certification has expired.', delivered: true },
      { userId: trainingManager.id, type: 'CAPA_ASSIGNMENT', subject: 'New CAPA assigned: CAPA-20240601-002', message: 'A CAPA has been assigned to you.', delivered: true },
      { userId: operator1.id, type: 'SIMULATION_RESULT', subject: 'Batch simulation PASSED — 84/100', message: 'Certificate generated.', delivered: true },
    ],
  });

  console.log('✅ Seed complete.');
  console.log('   Companies: 3 | Users: 10 | Machines: 3 | Modules:', createdModules.length);
  console.log('   Login with any demo account, password: demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
