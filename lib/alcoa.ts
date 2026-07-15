import { prisma } from './prisma';
import type { ALCOARecord } from './types';
import { getRecordHistory } from './audit-logger';

/**
 * ALCOA+ data-integrity utilities.
 * A = Attributable, L = Legible, C = Contemporaneous, O = Original,
 * A = Accurate, + Complete, Consistent, Enduring, Available.
 */

export function createALCOARecord(
  userId: string,
  _action: string,
  data: Record<string, unknown>
): ALCOARecord {
  const values = Object.values(data);
  const complete = values.length > 0 && values.every((v) => v !== null && v !== undefined && v !== '');
  return {
    attributable: userId,
    legible: true,
    contemporaneous: generateALCOATimestamp(),
    original: true,
    accurate: true,
    complete,
    consistent: true,
    enduring: 'PostgreSQL / immutable audit log',
    available: true,
  };
}

export function verifyALCOAIntegrity(record: ALCOARecord): boolean {
  return (
    Boolean(record.attributable) &&
    record.legible &&
    record.contemporaneous instanceof Date &&
    record.original &&
    record.accurate &&
    record.complete &&
    record.consistent &&
    Boolean(record.enduring) &&
    record.available
  );
}

/** Server-side timestamp — never trust client time (Contemporaneous). */
export function generateALCOATimestamp(): Date {
  return new Date();
}

/**
 * Lock a record to make it immutable. We record a LOCK entry in the audit
 * trail; the application layer enforces no-edit on locked records.
 */
export async function lockRecord(
  recordId: string,
  type: string,
  userId?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action: 'LOCK',
      entityType: type,
      entityId: recordId,
      newValue: { locked: true, lockedAt: new Date().toISOString() },
    },
  });
}

export async function getRecordAuditHistory(recordId: string, type: string) {
  return getRecordHistory(type, recordId);
}

export const ALCOA_PRINCIPLES = [
  { letter: 'A', name: 'Attributable', desc: 'Every entry linked to a person' },
  { letter: 'L', name: 'Legible', desc: 'Readable and permanent' },
  { letter: 'C', name: 'Contemporaneous', desc: 'Recorded at time of activity' },
  { letter: 'O', name: 'Original', desc: 'Primary source record' },
  { letter: 'A', name: 'Accurate', desc: 'Correct and verified' },
  { letter: '+', name: 'Complete', desc: 'All data present' },
  { letter: '+', name: 'Consistent', desc: 'Chronological, no contradiction' },
  { letter: '+', name: 'Enduring', desc: 'Durable, retained storage' },
  { letter: '+', name: 'Available', desc: 'Retrievable on demand' },
] as const;
