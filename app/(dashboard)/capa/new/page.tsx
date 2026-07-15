import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser, isManager } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { CAPAForm } from '@/components/capa/CAPAForm';

export default async function NewCAPAPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isManager(user.role)) redirect('/capa');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/capa">
            <ArrowLeft className="h-4 w-4" /> Back to CAPAs
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New CAPA</h1>
          <p className="text-sm text-muted-foreground">
            Raise a corrective &amp; preventive action. The CAPA number is generated automatically.
          </p>
        </div>
      </div>

      <CAPAForm />
    </div>
  );
}
