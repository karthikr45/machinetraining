import { User, GraduationCap, Cog, FileText, Calendar, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

type Result = 'PASS' | 'FAIL' | 'PENDING';

export interface OJTSummaryData {
  trainee: { name: string };
  trainer: { name: string };
  machine: { name: string };
  sopVersion: string;
  overallResult: string;
  conductedAt: string | Date;
  locked: boolean;
}

function OverallBadge({ result }: { result: string }) {
  const r = result as Result;
  if (r === 'PASS') return <Badge variant="success">Pass</Badge>;
  if (r === 'FAIL') return <Badge variant="destructive">Fail</Badge>;
  return <Badge variant="gray">Pending</Badge>;
}

export function OJTSummary({ record }: { record: OJTSummaryData }) {
  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <User className="h-4 w-4" />, label: 'Trainee', value: record.trainee.name },
    { icon: <GraduationCap className="h-4 w-4" />, label: 'Trainer', value: record.trainer.name },
    { icon: <Cog className="h-4 w-4" />, label: 'Machine', value: record.machine.name },
    { icon: <FileText className="h-4 w-4" />, label: 'SOP Version', value: record.sopVersion },
    { icon: <Calendar className="h-4 w-4" />, label: 'Conducted', value: formatDateTime(record.conductedAt) },
  ];

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">OJT Assessment</h2>
            <OverallBadge result={record.overallResult} />
          </div>
          {record.locked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              <Lock className="h-3.5 w-3.5" /> Locked
            </span>
          ) : null}
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{row.icon}</span>
              <dt className="w-28 shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 truncate font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
