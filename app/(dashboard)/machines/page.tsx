import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getCurrentUser, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { MachineGrid } from '@/components/machines/MachineGrid';
import type { MachineListItem } from '@/components/machines/types';

export const dynamic = 'force-dynamic';

export default async function MachinesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const machines = await prisma.machine.findMany({
    where: { companyId: user.companyId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { modules: true, documents: true } },
      simulationConfig: { select: { id: true } },
    },
  });

  const canManage = isManager(user.role);

  const items: MachineListItem[] = machines.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    industry: m.industry,
    manufacturer: m.manufacturer,
    modelNumber: m.modelNumber,
    location: m.location,
    description: m.description,
    status: m.status,
    requalifyMonths: m.requalifyMonths,
    yearOfMfg: m.yearOfMfg,
    createdAt: m.createdAt.toISOString(),
    _count: m._count,
    hasSimulation: Boolean(m.simulationConfig),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Machines</h1>
          <p className="text-sm text-muted-foreground">
            Equipment training library for your facility.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/machines/new">
              <Plus className="h-4 w-4" />
              Add Machine
            </Link>
          </Button>
        )}
      </div>

      <MachineGrid machines={items} canManage={canManage} />
    </div>
  );
}
