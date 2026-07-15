import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatTrainer } from '@/components/training/ChatTrainer';

export const dynamic = 'force-dynamic';

export default async function ChatPage({
  params,
}: {
  params: { machineId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const machine = await prisma.machine.findUnique({
    where: { id: params.machineId },
    select: { id: true, name: true, type: true, companyId: true },
  });

  if (!machine || machine.companyId !== user.companyId) notFound();

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/training/${machine.id}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to {machine.name}
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pharma-teal/15 text-pharma-teal">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{machine.name} — AI Trainer</h1>
            <p className="text-xs text-muted-foreground">{machine.type}</p>
          </div>
        </div>
        <Badge variant="teal">GMP-aware assistant</Badge>
      </div>

      <ChatTrainer machineId={machine.id} machineName={machine.name} />
    </div>
  );
}
