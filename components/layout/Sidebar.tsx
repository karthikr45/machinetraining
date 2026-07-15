'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Role } from '@prisma/client';
import { visibleNavItems } from '@/lib/navigation';
import { NavIcon } from './Icon';
import { cn } from '@/lib/utils';

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const items = visibleNavItems(role);

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-white">
      <div className="flex items-center gap-2 h-16 px-6 border-b">
        <span className="text-2xl">💊</span>
        <span className="font-extrabold text-lg text-pharma-blue">PharmaTrainX</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
              <span className="truncate">{safeT(t, item.labelKey, item.label)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        <div className="font-semibold text-pharma-blue">21 CFR Part 11</div>
        <div>ALCOA+ compliant records</div>
      </div>
    </aside>
  );
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
  try {
    const val = t(key);
    return val === `nav.${key}` ? fallback : val;
  } catch {
    return fallback;
  }
}
