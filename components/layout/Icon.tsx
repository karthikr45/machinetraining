'use client';

import {
  LayoutDashboard,
  Cog,
  FileText,
  GraduationCap,
  FlaskConical,
  ClipboardCheck,
  AlertTriangle,
  CalendarClock,
  ShieldCheck,
  ScrollText,
  BarChart3,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Cog,
  FileText,
  GraduationCap,
  FlaskConical,
  ClipboardCheck,
  AlertTriangle,
  CalendarClock,
  ShieldCheck,
  ScrollText,
  BarChart3,
  Users,
  Settings,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Comp = ICONS[name] ?? LayoutDashboard;
  return <Comp className={className} />;
}
