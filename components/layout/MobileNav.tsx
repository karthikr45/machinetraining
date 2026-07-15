'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';
import { visibleNavItems, MOBILE_NAV_KEYS } from '@/lib/navigation';
import { NavIcon } from './Icon';
import { cn } from '@/lib/utils';

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = visibleNavItems(role).filter((i) => MOBILE_NAV_KEYS.includes(i.href));

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-white flex justify-around">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-2 flex-1 min-h-[56px] text-[11px]',
              active ? 'text-primary' : 'text-slate-500'
            )}
          >
            <NavIcon name={item.icon} className="h-5 w-5" />
            <span className="truncate max-w-[64px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
