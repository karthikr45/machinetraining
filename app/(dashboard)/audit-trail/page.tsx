import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ALCOABadge } from '@/components/compliance/ALCOABadge';
import { AuditTrailViewer } from '@/components/compliance/AuditTrailViewer';

export const dynamic = 'force-dynamic';

export default async function AuditTrailPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Immutable, attributable record of every material change — 21 CFR Part 11 &amp; ALCOA+ compliant.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 print:hidden">
        <ALCOABadge />
      </div>

      <AuditTrailViewer />
    </div>
  );
}
