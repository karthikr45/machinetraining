import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handle, requireRole, ApiError } from '@/lib/api-helpers';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

/** Roles allowed to manage (view/create) users in a company. */
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

export async function GET() {
  return handle(async () => {
    const manager = await requireRole(USER_MANAGER_ROLES);
    const users = await prisma.user.findMany({
      where: { companyId: manager.companyId },
      select: userSelect,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
    return { users };
  });
}

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(Role),
  department: z.string().trim().optional().nullable(),
  employeeId: z.string().trim().optional().nullable(),
  isTrainer: z.boolean().optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const manager = await requireRole(USER_MANAGER_ROLES);

    const json = await req.json().catch(() => null);
    const parsed = createUserSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const { name, email, password, role, department, employeeId, isTrainer } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ApiError('An account with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        department: department ?? undefined,
        employeeId: employeeId ?? undefined,
        isTrainer: isTrainer ?? false,
        companyId: manager.companyId,
      },
      select: userSelect,
    });

    await logAction({
      userId: manager.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      newValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        isTrainer: user.isTrainer,
      },
      ipAddress: getClientIp(req.headers),
    });

    return { user };
  });
}
