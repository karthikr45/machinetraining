import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FlaskConical, Play, Trophy, XCircle, CheckCircle2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SimulationListPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [machines, records, allMachines] = await Promise.all([
    prisma.machine.findMany({
      where: { companyId: user.companyId, status: 'PUBLISHED' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        manufacturer: true,
        simulationConfig: { select: { id: true, productName: true } },
      },
    }),
    prisma.simulationRecord.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: 'desc' },
      take: 10,
    }),
    prisma.machine.findMany({
      where: { companyId: user.companyId },
      select: { id: true, name: true },
    }),
  ]);

  const machineName = new Map(allMachines.map((m) => [m.id, m.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pharma-blue/10 text-pharma-blue">
          <FlaskConical className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Batch Simulation</h1>
          <p className="text-sm text-muted-foreground">
            Run a full GMP batch production and earn a competency certificate.
          </p>
        </div>
      </div>

      {/* Machines */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Available Simulations</h2>
        {machines.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FlaskConical className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-semibold">No published machines yet</p>
                <p className="text-sm text-muted-foreground">
                  A training manager must publish a machine before you can simulate a batch.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/machines">Browse Machines</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {machines.map((m) => (
              <Card key={m.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{m.name}</CardTitle>
                    <Badge variant={m.simulationConfig ? 'success' : 'secondary'}>
                      {m.simulationConfig ? 'Configured' : 'Default'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {m.type}
                    {m.manufacturer ? ` · ${m.manufacturer}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Product: {m.simulationConfig?.productName ?? 'Paracetamol 500mg'} · 6 stages · pass mark 75/100
                  </p>
                  <Button asChild className="w-full">
                    <Link href={`/simulation/${m.id}`}>
                      <Play className="h-4 w-4" /> Run Batch Simulation
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent records */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Your Recent Batches</h2>
        <Card>
          <CardContent className="p-0">
            {records.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Trophy className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No simulations completed yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Result</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.batchNumber}</TableCell>
                        <TableCell>{machineName.get(r.machineId) ?? '—'}</TableCell>
                        <TableCell className="text-center font-mono tabular-nums">
                          {Math.round(r.totalScore)}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.passed ? (
                            <span className="inline-flex items-center gap-1 text-pharma-success">
                              <CheckCircle2 className="h-4 w-4" /> Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-pharma-danger">
                              <XCircle className="h-4 w-4" /> Fail
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(r.completedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/simulation/${r.machineId}/results?id=${r.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
