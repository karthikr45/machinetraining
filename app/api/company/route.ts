import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RegulatoryFramework, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handle, requireRole, ApiError } from '@/lib/api-helpers';
import { logAction } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils';

export const dynamic = "force-dynamic";

/** Roles allowed to edit company settings. */
const COMPANY_MANAGER_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER'];

const updateCompanySchema = z.object({
  name: z.string().trim().min(2).optional(),
  regulatoryFramework: z.nativeEnum(RegulatoryFramework).optional(),
  gstin: z.string().trim().nullable().optional(),
  licenseNumber: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
});

export async function PUT(req: Request) {
  return handle(async () => {
    const manager = await requireRole(COMPANY_MANAGER_ROLES);

    const existing = await prisma.company.findUnique({
      where: { id: manager.companyId },
    });
    if (!existing) throw new ApiError('Company not found', 404);

    const json = await req.json().catch(() => null);
    const parsed = updateCompanySchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const { name, regulatoryFramework, gstin, licenseNumber, address } = parsed.data;

    const data: Prisma.CompanyUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (regulatoryFramework !== undefined) data.regulatoryFramework = regulatoryFramework;
    if (gstin !== undefined) data.gstin = gstin;
    if (licenseNumber !== undefined) data.licenseNumber = licenseNumber;
    if (address !== undefined) data.address = address;

    const updated = await prisma.company.update({
      where: { id: existing.id },
      data,
    });

    await logAction({
      userId: manager.id,
      action: 'UPDATE',
      entityType: 'Company',
      entityId: updated.id,
      oldValue: {
        name: existing.name,
        regulatoryFramework: existing.regulatoryFramework,
        gstin: existing.gstin,
        licenseNumber: existing.licenseNumber,
        address: existing.address,
      },
      newValue: {
        name: updated.name,
        regulatoryFramework: updated.regulatoryFramework,
        gstin: updated.gstin,
        licenseNumber: updated.licenseNumber,
        address: updated.address,
      },
      ipAddress: getClientIp(req.headers),
    });

    return { company: updated };
  });
}
