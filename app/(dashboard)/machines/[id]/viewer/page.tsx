import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, Info } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MachineViewerScene } from '@/components/3d/MachineViewerScene';

export const dynamic = 'force-dynamic';

export default async function MachineViewerPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const machine = await prisma.machine.findFirst({
    where: { id: params.id, companyId: user.companyId },
    select: { id: true, name: true, type: true },
  });
  if (!machine) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/machines/${machine.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {machine.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">3D Viewer — {machine.name}</h1>
        <p className="text-sm text-muted-foreground">{machine.type}</p>
      </div>

      <MachineViewerScene />

      <div className="flex items-start gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-pharma-blue" />
        <span>
          Drag to orbit, scroll to zoom. Select a hotspot above the model to learn about each major
          component of the machine.
        </span>
      </div>
    </div>
  );
}
