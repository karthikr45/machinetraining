import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GraduationCap, ArrowRight, Layers, Factory } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainingProgress } from '@/components/training/TrainingProgress';
import { ExpiryBadge } from '@/components/training/ExpiryBadge';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const machines = await prisma.machine.findMany({
    where: { companyId: user.companyId, status: 'PUBLISHED' },
    orderBy: { name: 'asc' },
    include: {
      modules: { select: { id: true }, orderBy: { order: 'asc' } },
      trainingRecords: {
        where: { userId: user.id },
        select: { moduleId: true, status: true, expiresAt: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Training</h1>
          <p className="text-sm text-muted-foreground">
            Complete machine training modules, take quizzes, and keep your certifications current.
          </p>
        </div>
      </div>

      {machines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Factory className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No published machines yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Training becomes available once a training manager publishes a machine for your
              company.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((machine) => {
            const total = machine.modules.length;
            const moduleIds = new Set(machine.modules.map((m) => m.id));
            const moduleRecords = machine.trainingRecords.filter(
              (r) => r.moduleId && moduleIds.has(r.moduleId)
            );
            const completed = moduleRecords.filter((r) => r.status === 'COMPLETED').length;

            const anyStarted = machine.trainingRecords.some(
              (r) => r.status === 'IN_PROGRESS' || r.status === 'COMPLETED' || r.status === 'FAILED'
            );
            const overall =
              total > 0 && completed >= total
                ? 'COMPLETED'
                : anyStarted
                  ? 'IN_PROGRESS'
                  : 'NOT_STARTED';

            const expiries = moduleRecords
              .filter((r) => r.status === 'COMPLETED' && r.expiresAt)
              .map((r) => r.expiresAt as Date)
              .sort((a, b) => a.getTime() - b.getTime());
            const nearestExpiry = expiries[0] ?? null;
            const anyExpired = machine.trainingRecords.some((r) => r.status === 'EXPIRED');

            return (
              <Link key={machine.id} href={`/training/${machine.id}`} className="group">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base group-hover:text-primary">
                        {machine.name}
                      </CardTitle>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">{machine.type}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TrainingProgress completed={completed} total={total} />
                    <div className="flex flex-wrap items-center gap-2">
                      {overall === 'COMPLETED' ? (
                        <Badge variant="success">Completed</Badge>
                      ) : overall === 'IN_PROGRESS' ? (
                        <Badge variant="teal">In progress</Badge>
                      ) : (
                        <Badge variant="gray">Not started</Badge>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Layers className="h-3.5 w-3.5" />
                        {total} module{total === 1 ? '' : 's'}
                      </span>
                    </div>
                    {nearestExpiry || anyExpired ? (
                      <ExpiryBadge
                        expiresAt={nearestExpiry}
                        status={anyExpired ? 'EXPIRED' : 'COMPLETED'}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
