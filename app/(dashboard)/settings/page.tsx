import { redirect } from 'next/navigation';
import {
  Building2,
  Languages,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import type { SubscriptionPlan } from '@prisma/client';
import { getCurrentUser, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_LABELS } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { RegulatoryForm } from './regulatory-form';
import { REGULATORY_LABELS } from './regulatory-labels';

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value && value.length > 0 ? value : '—'}</p>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [profile, company] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
      },
    }),
    prisma.company.findUnique({ where: { id: user.companyId } }),
  ]);

  if (!profile || !company) redirect('/login');

  const canManage = isManager(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your profile, organization details and compliance configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-pharma-blue" />
              Profile
            </CardTitle>
            <CardDescription>Your account information.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Name" value={profile.name} />
            <Field label="Email" value={profile.email} />
            <div className="space-y-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Role
              </p>
              <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
            </div>
            <Field label="Department" value={profile.department} />
            <Field label="Employee ID" value={profile.employeeId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-pharma-blue" />
              Company
            </CardTitle>
            <CardDescription>Organization details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" value={company.name} />
              <Field label="Industry" value={company.industry} />
              <Field label="Subscription" value={PLAN_LABELS[company.subscriptionPlan]} />
              <Field
                label="Regulatory framework"
                value={REGULATORY_LABELS[company.regulatoryFramework]}
              />
              <Field label="GSTIN" value={company.gstin} />
              <Field label="License number" value={company.licenseNumber} />
            </div>

            {canManage && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Update regulatory framework</p>
                  <RegulatoryForm initial={company.regulatoryFramework} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-pharma-blue" />
              Language
            </CardTitle>
            <CardDescription>Choose your preferred interface language.</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-pharma-success" />
              Compliance
            </CardTitle>
            <CardDescription>Regulatory controls enforced by this system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-success" />
              <span>
                <span className="font-medium">21 CFR Part 11</span> — electronic records and
                electronic signatures with an immutable audit trail.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-success" />
              <span>
                <span className="font-medium">ALCOA+</span> — data is Attributable, Legible,
                Contemporaneous, Original, Accurate and Complete.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-success" />
              <span>
                <span className="font-medium">Session timeout</span> — sessions expire after 8
                hours, aligned to a single manufacturing shift.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
