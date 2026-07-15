import { redirect } from 'next/navigation';
import { getCurrentUser, isManager } from '@/lib/auth';
import { InspectionSimulator } from '@/components/mock-inspection/InspectionSimulator';

export default async function MockInspectionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isManager(user.role)) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mock FDA Inspection</h1>
        <p className="text-sm text-muted-foreground">
          Simulate an audit — check your readiness score and walk through an inspector&rsquo;s
          questions with live evidence and grading.
        </p>
      </div>
      <InspectionSimulator />
    </div>
  );
}
