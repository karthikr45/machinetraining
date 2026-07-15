import Link from 'next/link';
import { BookOpen, FileText, MapPin, Factory, Box } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MACHINE_STATUS_META, type MachineListItem } from './types';

export function MachineCard({ machine }: { machine: MachineListItem }) {
  const status = MACHINE_STATUS_META[machine.status];

  return (
    <Link
      href={`/machines/${machine.id}`}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-pharma-blue/10 text-pharma-blue">
              <Box className="h-6 w-6" />
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <CardTitle className="mt-3 line-clamp-2 text-base group-hover:text-pharma-blue">
            {machine.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{machine.type}</p>
        </CardHeader>
        <CardContent className="space-y-2 pb-3 text-sm text-muted-foreground">
          {machine.manufacturer && (
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {machine.manufacturer}
                {machine.modelNumber ? ` · ${machine.modelNumber}` : ''}
              </span>
            </div>
          )}
          {machine.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{machine.location}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            {machine._count.modules} module{machine._count.modules === 1 ? '' : 's'}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            {machine._count.documents} doc{machine._count.documents === 1 ? '' : 's'}
          </span>
          {machine.hasSimulation && (
            <span className={cn('ml-auto font-medium text-pharma-teal')}>Simulation ready</span>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
