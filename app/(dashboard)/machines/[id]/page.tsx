import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Pencil,
  Box,
  PlayCircle,
  GraduationCap,
  Factory,
  MapPin,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  Link2,
} from 'lucide-react';
import { getCurrentUser, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MACHINE_STATUS_META,
  MODULE_TYPE_LABELS,
} from '@/components/machines/types';

export const dynamic = 'force-dynamic';

export default async function MachineDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const machine = await prisma.machine.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: { quiz: { select: { id: true } } },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      sopDocuments: { orderBy: { createdAt: 'desc' } },
      simulationConfig: { select: { id: true, productName: true } },
    },
  });

  if (!machine) notFound();

  const canManage = isManager(user.role);
  const status = MACHINE_STATUS_META[machine.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-pharma-blue/10 text-pharma-blue">
            <Box className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{machine.name}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{machine.type}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {machine.manufacturer && (
                <span className="flex items-center gap-1.5">
                  <Factory className="h-4 w-4" />
                  {machine.manufacturer}
                  {machine.modelNumber ? ` · ${machine.modelNumber}` : ''}
                </span>
              )}
              {machine.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {machine.location}
                </span>
              )}
              {machine.yearOfMfg && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {machine.yearOfMfg}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Requalify every {machine.requalifyMonths} months
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button asChild variant="outline">
              <Link href={`/machines/${machine.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/machines/${machine.id}/viewer`}>
              <Box className="h-4 w-4" />
              3D Viewer
            </Link>
          </Button>
          {machine.simulationConfig && (
            <Button asChild variant="secondary">
              <Link href={`/simulations/${machine.id}`}>
                <PlayCircle className="h-4 w-4" />
                Run Simulation
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/training/${machine.id}`}>
              <GraduationCap className="h-4 w-4" />
              Start Training
            </Link>
          </Button>
        </div>
      </div>

      {machine.description && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            {machine.description}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules">Modules ({machine.modules.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({machine.documents.length})</TabsTrigger>
          <TabsTrigger value="sops">SOPs ({machine.sopDocuments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          {machine.modules.length === 0 ? (
            <EmptyPanel
              icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
              title="No modules yet"
              description="Training modules will appear here once generated or added."
            />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {machine.modules.map((m) => (
                <li key={m.id} className="flex items-center gap-3 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {m.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {MODULE_TYPE_LABELS[m.moduleType]} · {m.estimatedMinutes} min
                    </p>
                  </div>
                  <Badge variant="secondary">{MODULE_TYPE_LABELS[m.moduleType]}</Badge>
                  {m.quiz && <Badge variant="purple">Quiz</Badge>}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="documents">
          {machine.documents.length === 0 ? (
            <EmptyPanel
              icon={<FileText className="h-8 w-8 text-muted-foreground" />}
              title="No documents"
              description="Uploaded manuals and SOP files will be listed here."
            />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {machine.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-4">
                  <FileText className="h-5 w-5 shrink-0 text-pharma-blue" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <Badge variant={d.processed ? 'success' : 'gray'}>
                    {d.processed ? 'Processed' : 'Pending'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="sops">
          {machine.sopDocuments.length === 0 ? (
            <EmptyPanel
              icon={<Link2 className="h-8 w-8 text-muted-foreground" />}
              title="No linked SOPs"
              description="Standard operating procedures linked to this machine will appear here."
            />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {machine.sopDocuments.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-4">
                  <Link2 className="h-5 w-5 shrink-0 text-pharma-teal" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.sopNumber} · v{s.version}
                    </p>
                  </div>
                  <Badge variant="outline">{s.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      {icon}
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
