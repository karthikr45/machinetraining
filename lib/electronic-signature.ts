import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { logAction } from './audit-logger';
import { generateALCOATimestamp } from './alcoa';

export interface CreateSignatureInput {
  userId: string;
  recordType: string;
  recordId: string;
  meaning: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create a 21 CFR Part 11 compliant electronic signature.
 * Requires password re-entry; stores a signature hash + server timestamp;
 * links immutably to the record and writes to the audit trail.
 */
export async function createElectronicSignature(input: CreateSignatureInput) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error('User not found');

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) throw new Error('Invalid password — signature rejected');

  const signedAt = generateALCOATimestamp();
  const hash = createHash('sha256')
    .update(
      `${user.id}|${input.recordType}|${input.recordId}|${input.meaning}|${signedAt.toISOString()}`
    )
    .digest('hex');

  const signature = await prisma.electronicSignature.create({
    data: {
      userId: input.userId,
      recordType: input.recordType,
      recordId: input.recordId,
      meaning: input.meaning,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      signedAt,
      isValid: true,
    },
  });

  await logAction({
    userId: input.userId,
    action: 'SIGN',
    entityType: input.recordType,
    entityId: input.recordId,
    newValue: { signatureId: signature.id, meaning: input.meaning, hash },
    changeReason: input.meaning,
    ipAddress: input.ipAddress,
  });

  return { signature, hash };
}

export async function verifySignature(signatureId: string): Promise<boolean> {
  const sig = await prisma.electronicSignature.findUnique({
    where: { id: signatureId },
  });
  return Boolean(sig?.isValid);
}

/** Verify a user's password without creating a signature (used for locking flows). */
export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return bcrypt.compare(password, user.password);
}

export async function getSignatureManifest(recordId: string, recordType: string) {
  return prisma.electronicSignature.findMany({
    where: { recordId, recordType },
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: { signedAt: 'asc' },
  });
}
