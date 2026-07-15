'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
} from 'recharts';
import {
  LayoutDashboard,
  Grid3x3,
  FlaskConical,
  ClipboardList,
  ScrollText,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { apiFetch } from '@/lib/client';
import { formatDate, formatPct } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ComplianceDashboard } from '@/components/reports/ComplianceDashboard';
import { TrainingMatrix } from '@/components/reports/TrainingMatrix';
import { ExportPanel } from '@/components/reports/ExportPanel';
import { AuditTrail, ImmutabilityNotice, type AuditEntry } from '@/components/reports/AuditTrail';

const COLORS = {
  blue: '#0066CC',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  purple: '#7C3AED',
  teal: '#0D9488',
};

const CAPA_STATUS_COLORS: Record<string, string> = {
  OPEN: COLORS.warning,
  INVESTIGATION: COLORS.blue,
  ACTION_TAKEN: COLORS.teal,
  VERIFICATION: COLORS.purple,
  CLOSED: COLORS.success,
  OVERDUE: COLORS.danger,
};

interface OverviewData {
  simScoreTrend: { month: string; avgScore: number }[];
  capaBreakdown: { status: string; count: number }[];
  recentSims: {
    id: string;
    user: string;
    machine: string;
    batchNumber: string;
    totalScore: number;
    passed: boolean;
    completedAt: string;
  }[];
  openCapaList: {
    id: string;
    capaNumber: string;
    title: string;
    severity: string;
    status: string;
    dueDate: string;
    owner: string;
  }[];
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports &amp; Compliance</h1>
        <p className="text-sm text-muted-foreground">
          Training, simulation, CAPA, audit and regulatory reporting in one place.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-1.5">
            <Grid3x3 className="h-4 w-4" /> Training Matrix
          </TabsTrigger>
          <TabsTrigger value="simulation" className="gap-1.5">
            <FlaskConical className="h-4 w-4" /> Simulation
          </TabsTrigger>
          <TabsTrigger value="capa" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> CAPA
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ScrollText className="h-4 w-4" /> Audit
          </TabsTrigger>
          <TabsTrigger value="schedule-m" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Schedule M
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-1.5">
            <Download className="h-4 w-4" /> Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ComplianceDashboard />
        </TabsContent>
        <TabsContent value="matrix">
          <TrainingMatrix />
        </TabsContent>
        <TabsContent value="simulation">
          <SimulationTab />
        </TabsContent>
        <TabsContent value="capa">
          <CapaTab />
        </TabsContent>
        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>
        <TabsContent value="schedule-m">
          <ScheduleMTab />
        </TabsContent>
        <TabsContent value="export">
          <ExportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<OverviewData>('/api/reports/overview');
        if (active) setData(res);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return { data, loading, error };
}

function PanelSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[240px] w-full" />
      </CardContent>
    </Card>
  );
}

function severityVariant(sev: string): 'warning' | 'destructive' | 'secondary' {
  if (sev === 'CRITICAL') return 'destructive';
  if (sev === 'MAJOR') return 'warning';
  return 'secondary';
}

function SimulationTab() {
  const { data, loading, error } = useOverview();
  if (loading) return <PanelSkeleton />;
  if (error) return <Card><CardContent className="p-8 text-center text-sm text-destructive">{error}</CardContent></Card>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Average Simulation Score</CardTitle>
          <CardDescription>Monthly average over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.simScoreTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <ReTooltip />
              <Line type="monotone" dataKey="avgScore" stroke={COLORS.blue} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.blue }} name="Avg Score" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Simulations</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {data.recentSims.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">No simulations recorded.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSims.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.user}</TableCell>
                    <TableCell className="text-sm">{s.machine}</TableCell>
                    <TableCell className="font-mono text-xs">{s.batchNumber}</TableCell>
                    <TableCell>{formatPct(s.totalScore)}</TableCell>
                    <TableCell>
                      <Badge variant={s.passed ? 'success' : 'destructive'}>{s.passed ? 'PASS' : 'FAIL'}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(s.completedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CapaTab() {
  const { data, loading, error } = useOverview();
  if (loading) return <PanelSkeleton />;
  if (error) return <Card><CardContent className="p-8 text-center text-sm text-destructive">{error}</CardContent></Card>;
  if (!data) return null;

  const capaChart = data.capaBreakdown.filter((c) => c.count > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">CAPA Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {capaChart.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No CAPAs recorded.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={capaChart}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry) => `${entry.status}: ${entry.count}`}
                  labelLine={false}
                >
                  {capaChart.map((entry) => (
                    <Cell key={entry.status} fill={CAPA_STATUS_COLORS[entry.status] ?? COLORS.blue} />
                  ))}
                </Pie>
                <ReTooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Open CAPAs</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {data.openCapaList.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">No open CAPAs.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CAPA</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.openCapaList.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.capaNumber}</TableCell>
                    <TableCell className="max-w-[16rem] truncate text-sm" title={c.title}>{c.title}</TableCell>
                    <TableCell><Badge variant={severityVariant(c.severity)}>{c.severity}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{c.owner}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(c.dueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ entries: AuditEntry[] }>('/api/audit-log?take=50');
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PanelSkeleton />;
  if (error) return <Card><CardContent className="p-8 text-center text-sm text-destructive">{error}</CardContent></Card>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <ImmutabilityNotice />
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/audit-trail">
            Full audit trail
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">No audit entries.</div>
          ) : (
            <AuditTrail entries={entries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ScheduleMItem {
  chapter: string;
  title: string;
  requirement: string;
  status: 'MET' | 'PARTIAL' | 'GAP';
  evidence: string;
}
interface ScheduleMReport {
  overallPct: number;
  items: ScheduleMItem[];
  metCount: number;
  partialCount: number;
  gapCount: number;
}

const SM_STATUS: Record<ScheduleMItem['status'], { variant: 'success' | 'warning' | 'destructive'; icon: typeof CheckCircle2 }> = {
  MET: { variant: 'success', icon: CheckCircle2 },
  PARTIAL: { variant: 'warning', icon: AlertTriangle },
  GAP: { variant: 'destructive', icon: XCircle },
};

function ScheduleMTab() {
  const [report, setReport] = useState<ScheduleMReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<ScheduleMReport>('/api/reports/schedule-m');
        if (active) setReport(res);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <PanelSkeleton />;
  if (error) return <Card><CardContent className="p-8 text-center text-sm text-destructive">{error}</CardContent></Card>;
  if (!report) return null;

  const gaps = report.items.filter((i) => i.status !== 'MET');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-pharma-blue" />
            Schedule M Compliance
          </CardTitle>
          <CardDescription>Indian GMP (Revised Schedule M) — live platform evidence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">{report.overallPct}%</div>
            <div className="flex-1">
              <Progress value={report.overallPct} className="h-3" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{report.metCount} Met</Badge>
            <Badge variant="warning">{report.partialCount} Partial</Badge>
            <Badge variant="destructive">{report.gapCount} Gap</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Compliance Checklist</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ch.</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.items.map((item, i) => {
                const meta = SM_STATUS[item.status];
                const Icon = meta.icon;
                return (
                  <TableRow key={`${item.chapter}-${i}`}>
                    <TableCell className="font-mono text-xs">{item.chapter}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.requirement}</div>
                      <div className="text-xs text-muted-foreground">{item.title}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.evidence}</TableCell>
                    <TableCell>
                      <Badge variant={meta.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {gaps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-pharma-warning" />
              Gap Analysis
            </CardTitle>
            <CardDescription>Requirements needing attention before inspection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {gaps.map((g, i) => (
              <div key={`gap-${i}`} className="flex items-start gap-3 rounded-lg border p-3">
                <Badge variant={SM_STATUS[g.status].variant} className="mt-0.5 shrink-0">
                  {g.status}
                </Badge>
                <div>
                  <div className="text-sm font-medium">{g.requirement}</div>
                  <div className="text-xs text-muted-foreground">{g.evidence}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
