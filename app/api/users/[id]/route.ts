import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handle, requireUser, requireRole, ApiError } from '@/lib/api-helpers';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

/** Roles allowed to manage users in a company. */
const USER_MANAGER_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER'];

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  employeeId: true,
  isTrainer: true,
  trainerQualifications: true,
  preferredLanguage: true,
  createdAt: true,
} as const;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const caller = await requireUser();
    const user = await prisma.user.findFirst({
      where: { id: params.id, companyId: caller.companyId },
      select: userSelect,
    });
    if (!user) throw new ApiError('User not found', 404);
    return { user };
  });
}

const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.nativeEnum(Role).optional(),
  department: z.string().trim().nullable().optional(),
  employeeId: z.string().trim().nullable().optional(),
  isTrainer: z.boolean().optional(),
  trainerQualifications: z.array(z.string()).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const manager = await requireRole(USER_MANAGER_ROLES);

    const existing = await prisma.user.findFirst({
      where: { id: params.id, companyId: manager.companyId },
      select: userSelect,
    });
    if (!existing) throw new ApiError('User not found', 404);

    const json = await req.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const { name, role, department, employeeId, isTrainer, trainerQualifications, password } =
      parsed.data;

    const data: Prisma.UserUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (department !== undefined) data.department = department;
    if (employeeId !== undefined) data.employeeId = employeeId;
    if (isTrainer !== undefined) data.isTrainer = isTrainer;
    if (trainerQualifications !== undefined) data.trainerQualifications = trainerQualifications;
    if (password !== undefined) data.password = await bcrypt.hash(password, 12);

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data,
      select: userSelect,
    });

    await logAction({
      userId: manager.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: updated.id,
      oldValue: {
        name: existing.name,
        role: existing.role,
        department: existing.department,
        employeeId: existing.employeeId,
        isTrainer: existing.isTrainer,
        passwordChanged: false,
      },
      newValue: {
        name: updated.name,
        role: updated.role,
        department: updated.department,
        employeeId: updated.employeeId,
        isTrainer: updated.isTrainer,
        passwordChanged: password !== undefined,
      },
      ipAddress: getClientIp(req.headers),
    });

    return { user: updated };
  });
}
