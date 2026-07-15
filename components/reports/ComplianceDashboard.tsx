'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Factory,
  GraduationCap,
  FlaskConical,
  ShieldCheck,
  ClipboardList,
  CalendarClock,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Plus,
  Play,
  FilePlus2,
  ClipboardCheck,
  Search,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
} from 'recharts';
import { apiFetch } from '@/lib/client';
import { formatDate, formatDateTime, formatPct } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface DashboardStats {
  machinesPublished: number;
  operatorsTrainedThisMonth: number;
  batchesSimulated: number;
  complianceRate: number;
  openCapas: number;
  expiringCerts: number;
  expiredCerts: number;
  overdueCapas: number;
}

interface OverviewData {
  scope: 'company' | 'self';
  stats: DashboardStats;
  trainingByDepartment: { department: string; completed: number; total: number }[];
  simScoreTrend: { month: string; avgScore: number }[];
  capaBreakdown: { status: string; count: number }[];
  complianceTrend: { month: string; rate: number }[];
  recentCompletions: {
    id: string;
    user: string;
    department: string | null;
    machine: string;
    score: number | null;
    isRequalification: boolean;
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
  upcomingRequal: {
    id: string;
    user: string;
    department: string | null;
    machine: string;
    status: string;
    expiresAt: string | null;
  }[];
  recentSims: {
    id: string;
    user: string;
    machine: string;
    batchNumber: string;
    totalScore: number;
    passed: boolean;
    completedAt: string;
  }[];
}

const QUICK_ACTIONS = [
  { label: 'Add Machine', href: '/machines/new', icon: Plus },
  { label: 'Run Simulation', href: '/simulation', icon: Play },
  { label: 'New CAPA', href: '/capa/new', icon: FilePlus2 },
  { label: 'OJT Sign-off', href: '/ojt', icon: ClipboardCheck },
  { label: 'Mock Inspection', href: '/inspection', icon: Search },
];

function severityVariant(sev: string): 'warning' | 'destructive' | 'secondary' {
  if (sev === 'CRITICAL') return 'destructive';
  if (sev === 'MAJOR') return 'warning';
  return 'secondary';
}

export function ComplianceDashboard() {
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
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
          <AlertOctagon className="h-8 w-8 text-destructive" />
          <p className="font-medium">Unable to load dashboard</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { stats } = data;
  const statCards = [
    { label: 'Machines Published', value: stats.machinesPublished, icon: Factory, tone: 'blue' as const },
    { label: 'Operators Trained (Month)', value: stats.operatorsTrainedThisMonth, icon: GraduationCap, tone: 'teal' as const },
    { label: 'Batches Simulated', value: stats.batchesSimulated, icon: FlaskConical, tone: 'purple' as const },
    { label: 'Compliance Rate', value: formatPct(stats.complianceRate), icon: ShieldCheck, tone: 'success' as const },
    {
      label: 'Open CAPAs',
      value: stats.openCapas,
      icon: ClipboardList,
      tone: stats.openCapas > 5 ? ('danger' as const) : ('blue' as const),
    },
    {
      label: 'Expiring Certifications',
      value: stats.expiringCerts,
      icon: CalendarClock,
      tone: stats.expiringCerts > 0 ? ('warning' as const) : ('blue' as const),
    },
  ];

  const toneClass: Record<string, string> = {
    blue: 'bg-pharma-blue/10 text-pharma-blue',
    teal: 'bg-pharma-teal/10 text-pharma-teal',
    purple: 'bg-pharma-purple/10 text-pharma-purple',
    success: 'bg-pharma-success/10 text-pharma-success',
    warning: 'bg-pharma-warning/10 text-pharma-warning',
    danger: 'bg-pharma-danger/10 text-pharma-danger',
  };

  const deptChart = data.trainingByDepartment.map((d) => ({
    department: d.department,
    completed: d.completed,
    remaining: Math.max(0, d.total - d.completed),
  }));

  const capaChart = data.capaBreakdown.filter((c) => c.count > 0);

  return (
    <div className="space-y-6">
      {/* Alert banners */}
      <div className="space-y-2">
        {stats.expiredCerts > 0 && (
          <AlertBanner
            tone="danger"
            icon={AlertOctagon}
            message={`${stats.expiredCerts} certification${stats.expiredCerts > 1 ? 's have' : ' has'} expired. Requalification required immediately.`}
            href="/requalification"
          />
        )}
        {stats.expiringCerts > 0 && (
          <AlertBanner
            tone="warning"
            icon={Clock}
            message={`${stats.expiringCerts} certification${stats.expiringCerts > 1 ? 's expire' : ' expires'} within 30 days.`}
            href="/requalification"
          />
        )}
        {stats.overdueCapas > 0 && (
          <AlertBanner
            tone="caution"
            icon={AlertTriangle}
            message={`${stats.overdueCapas} CAPA${stats.overdueCapas > 1 ? 's are' : ' is'} overdue and past the due date.`}
            href="/capa"
          />
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <Card className="h-full">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass[card.tone]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold leading-tight">{card.value}</div>
                    <div className="text-xs text-muted-foreground">{card.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick actions */}
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Button key={a.label} asChild variant="outline" className="gap-2">
                <Link href={a.href}>
                  <Icon className="h-4 w-4" />
                  {a.label}
                </Link>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Training by Department" description="Completed vs remaining assignments">
          {deptChart.length === 0 ? (
            <EmptyChart message="No training data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptChart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <ReTooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill={COLORS.success} name="Completed" radius={[0, 0, 0, 0]} />
                <Bar dataKey="remaining" stackId="a" fill={COLORS.warning} name="Remaining" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Simulation Scores" description="Average monthly score (last 6 months)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.simScoreTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <ReTooltip />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke={COLORS.blue}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLORS.blue }}
                name="Avg Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="CAPA Status" description="Distribution of corrective actions">
          {capaChart.length === 0 ? (
            <EmptyChart message="No CAPAs recorded" />
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
        </ChartCard>

        <ChartCard title="Compliance Rate" description="Completion rate over time (last 6 months)">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.complianceTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <ReTooltip formatter={(v: number) => `${v}%`} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke={COLORS.teal}
                strokeWidth={2.5}
                fill="url(#complianceGradient)"
                name="Compliance %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TableCard title="Recent Completions" description="Latest completed training">
          {data.recentCompletions.length === 0 ? (
            <EmptyRow message="No completed training yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentCompletions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.user}</div>
                      {r.department && <div className="text-xs text-muted-foreground">{r.department}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{r.machine}</TableCell>
                    <TableCell>{r.score === null ? '—' : formatPct(r.score)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(r.completedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableCard>

        <TableCard title="Open CAPAs" description="Corrective actions requiring attention">
          {data.openCapaList.length === 0 ? (
            <EmptyRow message="No open CAPAs" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CAPA</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.openCapaList.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.capaNumber}</div>
                      <div className="max-w-[14rem] truncate text-xs text-muted-foreground">{c.title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={severityVariant(c.severity)}>{c.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.owner}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(c.dueDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableCard>

        <TableCard title="Upcoming Requalifications" description="Certifications expiring soon">
          {data.upcomingRequal.length === 0 ? (
            <EmptyRow message="No upcoming requalifications" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.upcomingRequal.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.user}</TableCell>
                    <TableCell className="text-sm">{r.machine}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'EXPIRED' ? 'destructive' : 'warning'}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(r.expiresAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableCard>

        <TableCard title="Recent Simulations" description="Latest batch simulations">
          {data.recentSims.length === 0 ? (
            <EmptyRow message="No simulations yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSims.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.user}</div>
                      <div className="text-xs text-muted-foreground">{s.machine}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.batchNumber}</TableCell>
                    <TableCell>{formatPct(s.totalScore)}</TableCell>
                    <TableCell>
                      <Badge variant={s.passed ? 'success' : 'destructive'}>
                        {s.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableCard>
      </div>
    </div>
  );
}

function AlertBanner({
  tone,
  icon: Icon,
  message,
  href,
}: {
  tone: 'danger' | 'warning' | 'caution';
  icon: typeof AlertTriangle;
  message: string;
  href: string;
}) {
  const styles: Record<string, string> = {
    danger: 'border-pharma-danger/30 bg-pharma-danger/10 text-pharma-danger',
    warning: 'border-pharma-warning/30 bg-pharma-warning/10 text-pharma-warning',
    caution: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  };
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <Link href={href}>
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${styles[tone]}`}>
          <Icon className="h-5 w-5 shrink-0" />
          <span className="flex-1">{message}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TableCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-2">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <div className="px-6 py-10 text-center text-sm text-muted-foreground">{message}</div>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-4 w-40" />
              <Skeleton className="h-[240px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
