import type { Role } from '@prisma/client';

/** ---------- Auth / Session ---------- */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  department?: string | null;
  isTrainer: boolean;
  preferredLanguage: string;
}

/** ---------- Training content (stored as JSON) ---------- */
export interface ModuleSection {
  heading: string;
  body: string;
  bullets?: string[];
  imageUrl?: string;
}

export interface ModuleContent {
  summary: string;
  objectives: string[];
  sections: ModuleSection[];
  keyPoints: string[];
  safetyNotes?: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  questionHi?: string;
  options: string[];
  optionsHi?: string[];
  correctIndex: number;
  explanation: string;
}

/** ---------- Simulation ---------- */
export type StageKey =
  | 'dispensing'
  | 'granulation'
  | 'compression'
  | 'coating'
  | 'qc'
  | 'bmr';

export interface StageMeta {
  key: StageKey;
  title: string;
  maxPoints: number;
  order: number;
}

export const SIMULATION_STAGES: StageMeta[] = [
  { key: 'dispensing', title: 'Raw Material Dispensing', maxPoints: 15, order: 1 },
  { key: 'granulation', title: 'Granulation', maxPoints: 15, order: 2 },
  { key: 'compression', title: 'Compression', maxPoints: 25, order: 3 },
  { key: 'coating', title: 'Film Coating', maxPoints: 15, order: 4 },
  { key: 'qc', title: 'Quality Control', maxPoints: 15, order: 5 },
  { key: 'bmr', title: 'Batch Manufacturing Record', maxPoints: 15, order: 6 },
];

export interface Fault {
  id: string;
  stage: StageKey;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  options: string[];
  correctAnswer: number;
  explanation: string;
  gmpReference: string;
  deviationRequired: boolean;
  points: number;
}

export interface FaultResponse {
  faultId: string;
  stage: StageKey;
  selectedOption: number;
  correct: boolean;
  pointsAwarded: number;
  deviationDocumented?: boolean;
  rootCause?: string;
  actionTaken?: string;
}

export interface FaultResult {
  correct: boolean;
  pointsAwarded: number;
  explanation: string;
  correctAnswer: number;
}

export interface MaterialEntry {
  material: string;
  target: number;
  tolerancePct: number;
  entered: number;
  variancePct: number;
  status: 'ok' | 'warn' | 'fail';
}

export interface DeviationLogEntry {
  id: string;
  stage: StageKey;
  deviation: string;
  rootCause: string;
  action: string;
  impact: string;
  severity: string;
}

export interface StageResult {
  stage: StageKey;
  score: number;
  maxPoints: number;
  data: Record<string, unknown>;
  deviations: DeviationLogEntry[];
}

export interface SimulationSubmission {
  machineId: string;
  batchNumber: string;
  durationSeconds: number;
  stages: StageResult[];
  faultResponses: FaultResponse[];
  bmrSigned: boolean;
  signaturePassword?: string;
}

export interface BMRDocument {
  productName: string;
  batchNumber: string;
  batchSize: number;
  manufacturingDate: string;
  expiryDate: string;
  theoreticalYield: number;
  actualYield: number;
  yieldPct: number;
  dispensing: MaterialEntry[];
  granulation: Record<string, unknown>;
  compression: Record<string, unknown>;
  coating: Record<string, unknown>;
  qc: Record<string, unknown>;
  deviations: DeviationLogEntry[];
  reconciliation: {
    input: number;
    tabletsProduced: number;
    rejects: number;
    samples: number;
    coatingLoss: number;
    yieldPct: number;
  };
}

/** ---------- CAPA ---------- */
export type CAPATrigger =
  | 'QUIZ_FAILED_3_TIMES'
  | 'SIMULATION_SCORE_BELOW_50'
  | 'OJT_FAILED'
  | 'CERT_EXPIRED_30_DAYS'
  | 'SIMULATION_CRITICAL_FAULT_WRONG'
  | 'BMR_CRITICAL_DEVIATION';

/** ---------- OJT ---------- */
export interface OJTChecklistItem {
  id: number;
  section: string;
  text: string;
  result: 'PASS' | 'FAIL' | 'PENDING';
  comment?: string;
}

export const OJT_CHECKLIST_TEMPLATE: Omit<OJTChecklistItem, 'result' | 'comment'>[] = [
  { id: 1, section: 'PRE-START CHECKS', text: 'Line clearance completed correctly' },
  { id: 2, section: 'PRE-START CHECKS', text: 'BMR available at machine' },
  { id: 3, section: 'PRE-START CHECKS', text: 'Correct tooling verified' },
  { id: 4, section: 'PRE-START CHECKS', text: 'Hopper loading procedure followed' },
  { id: 5, section: 'MACHINE OPERATION', text: 'Startup sequence performed correctly' },
  { id: 6, section: 'MACHINE OPERATION', text: 'Initial parameters set as per BMR' },
  { id: 7, section: 'MACHINE OPERATION', text: 'In-process check performed correctly' },
  { id: 8, section: 'MACHINE OPERATION', text: 'Weight check procedure demonstrated' },
  { id: 9, section: 'MACHINE OPERATION', text: 'Hardness check performed correctly' },
  { id: 10, section: 'FAULT RESPONSE', text: 'Response to weight variation correct' },
  { id: 11, section: 'FAULT RESPONSE', text: 'Machine stop procedure correct' },
  { id: 12, section: 'FAULT RESPONSE', text: 'Deviation documentation correct' },
  { id: 13, section: 'DOCUMENTATION', text: 'BMR entries made correctly' },
  { id: 14, section: 'DOCUMENTATION', text: 'In-process records completed' },
  { id: 15, section: 'DOCUMENTATION', text: 'Signature applied correctly' },
];

/** ---------- Mock Inspection ---------- */
export interface InspectionQuestionResult {
  id: number;
  question: string;
  category: string;
  evidence: Record<string, unknown>;
  grade: 'COMPLETE' | 'GAPS' | 'MISSING';
  findingLevel: 'NONE' | 'OBSERVATION' | 'MINOR' | 'MAJOR' | 'CRITICAL';
  finding?: string;
  recommendation?: string;
}

export interface ReadinessScore {
  overall: number;
  categories: { name: string; score: number }[];
}

export interface InspectionResult {
  readiness: ReadinessScore;
  questions: InspectionQuestionResult[];
  grade: 'READY' | 'NEEDS_IMPROVEMENT' | 'NOT_READY';
  summary: string;
}

/** ---------- ALCOA+ ---------- */
export interface ALCOARecord {
  attributable: string;
  legible: boolean;
  contemporaneous: Date;
  original: boolean;
  accurate: boolean;
  complete: boolean;
  consistent: boolean;
  enduring: string;
  available: boolean;
}

/** ---------- Reports ---------- */
export interface DashboardStats {
  machinesPublished: number;
  operatorsTrainedThisMonth: number;
  batchesSimulated: number;
  complianceRate: number;
  openCapas: number;
  expiringCerts: number;
  expiredCerts: number;
  overdueCapas: number;
}

/** Role display helpers */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TRAINING_MANAGER: 'Training Manager',
  OPERATOR: 'Operator',
  TECHNICIAN: 'Technician',
  QA_OFFICER: 'QA Officer',
  TRAINER: 'Trainer',
};
