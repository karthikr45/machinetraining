import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={user.role} />
      <div className="md:pl-64">
        <Topbar user={user} />
        <main className="px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
      <MobileNav role={user.role} />
    </div>
  );
}
