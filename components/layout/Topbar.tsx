'use client';

import { signOut } from 'next-auth/react';
import { LogOut, Bell } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ROLE_LABELS } from '@/lib/types';
import { initials } from '@/lib/utils';
import type { Role } from '@prisma/client';

export function Topbar({
  user,
}: {
  user: { name: string; email: string; role: Role; department?: string | null };
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/95 backdrop-blur px-4 md:px-8">
      <div className="md:hidden flex items-center gap-2">
        <span className="text-xl">💊</span>
        <span className="font-bold text-pharma-blue">PharmaTrainX</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitcher compact />
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-slate-100">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium leading-tight">{user.name}</div>
                <div className="text-xs text-muted-foreground leading-tight">
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
              {user.department && (
                <div className="text-xs text-muted-foreground mt-0.5">{user.department}</div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
