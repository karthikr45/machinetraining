import { redirect } from 'next/navigation';
import { getCurrentUser, isManager } from '@/lib/auth';
import { RequalificationDashboard } from '@/components/requalification/RequalificationDashboard';

export default async function RequalificationPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isManager(user.role)) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Requalification</h1>
        <p className="text-sm text-muted-foreground">
          Operator competency matrix — track expiring and expired certifications and assign
          retraining.
        </p>
      </div>
      <RequalificationDashboard />
    </div>
  );
}
