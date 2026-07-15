import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getCurrentUser, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MachineWizard } from '@/components/machines/MachineWizard';

export const dynamic = 'force-dynamic';

export default async function NewMachinePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isManager(user.role)) redirect('/machines');

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { industry: true },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/machines"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to machines
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Add a Machine</h1>
        <p className="text-sm text-muted-foreground">
          Set up equipment details, upload manuals, and generate AI training in five steps.
        </p>
      </div>

      <MachineWizard defaultIndustry={company?.industry ?? 'PHARMA'} />
    </div>
  );
}
