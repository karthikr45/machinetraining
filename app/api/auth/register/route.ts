import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Industry, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handle, ApiError } from '@/lib/api-helpers';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().trim().min(2, 'Company name is required'),
  industry: z.nativeEnum(Industry),
  role: z.nativeEnum(Role).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const json = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const { name, email, password, companyName, industry, role } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ApiError('An account with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // A newly registered organization always starts a fresh Company; the
    // registering user is therefore its first user and defaults to ADMIN.
    const company = await prisma.company.create({
      data: { name: companyName, industry },
    });

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: role ?? Role.ADMIN,
        companyId: company.id,
      },
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });

    await logAction({
      userId: user.id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
      newValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: company.name,
      },
      ipAddress: getClientIp(req.headers),
    });

    return { ok: true };
  });
}
