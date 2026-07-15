import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ComplianceDashboard } from '@/components/reports/ComplianceDashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live training, simulation, CAPA and certification health for your organisation.
        </p>
      </div>
      <ComplianceDashboard />
    </div>
  );
}
