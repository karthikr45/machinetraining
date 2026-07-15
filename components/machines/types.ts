import type { Industry, MachineStatus, ModuleType } from '@prisma/client';
import type { ModuleContent, QuizQuestion } from '@/lib/types';

/** Machine as rendered in list views (dates serialised to ISO strings). */
export interface MachineListItem {
  id: string;
  name: string;
  type: string;
  industry: Industry;
  manufacturer: string | null;
  modelNumber: string | null;
  location: string | null;
  description: string | null;
  status: MachineStatus;
  requalifyMonths: number;
  yearOfMfg: number | null;
  createdAt: string;
  _count: { modules: number; documents: number };
  hasSimulation: boolean;
}

export interface DocumentDTO {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  processed: boolean;
  extractedText: string | null;
  createdAt: string;
}

export interface ModuleSummary {
  id: string;
  title: string;
  moduleType: ModuleType;
  order: number;
  estimatedMinutes: number;
  hasQuiz: boolean;
}

/** Result returned by the AI processing step in the wizard. */
export interface ProcessResult {
  documentId: string;
  extractedTextLength: number;
  createdModules: number;
  moduleTitles: string[];
}

/** A created machine returned by POST /api/machines. */
export interface CreatedMachine {
  id: string;
  name: string;
  type: string;
  status: MachineStatus;
}

export const MACHINE_STATUS_META: Record<
  MachineStatus,
  { label: string; variant: 'gray' | 'success' | 'warning' }
> = {
  DRAFT: { label: 'Draft', variant: 'gray' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'warning' },
};

export const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: 'PHARMA', label: 'Pharmaceutical' },
  { value: 'FOOD_BEVERAGE', label: 'Food & Beverage' },
  { value: 'AUTOMOTIVE', label: 'Automotive' },
  { value: 'OTHER', label: 'Other' },
];

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  OVERVIEW: 'Overview',
  OPERATION: 'Operation',
  SAFETY: 'Safety',
  MAINTENANCE: 'Maintenance',
  COMPLIANCE: 'Compliance',
  CLEANROOM: 'Cleanroom',
  OJT: 'On-the-Job',
};

export interface BasicInfo {
  name: string;
  type: string;
  industry: Industry;
  manufacturer: string;
  modelNumber: string;
  yearOfMfg: string;
  location: string;
  description: string;
  requalifyMonths: string;
}

export interface SopOption {
  id: string;
  title: string;
  sopNumber: string;
  version: string;
}

export const REGULATORY_FRAMEWORKS: { value: string; label: string }[] = [
  { value: 'SCHEDULE_M', label: 'Schedule M (India CDSCO)' },
  { value: 'FDA_21_CFR', label: 'US FDA 21 CFR Part 11' },
  { value: 'EU_GMP', label: 'EU GMP' },
  { value: 'WHO_GMP', label: 'WHO GMP' },
  { value: 'HACCP', label: 'HACCP' },
  { value: 'ISO_9001', label: 'ISO 9001' },
  { value: 'IATF_16949', label: 'IATF 16949' },
];

export type { ModuleContent, QuizQuestion };
