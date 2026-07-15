import type { Role } from '@prisma/client';

export interface NavItem {
  href: string;
  labelKey: string; // i18n key under "nav"
  label: string; // fallback English
  icon: string; // lucide icon name
  roles?: Role[]; // if omitted, visible to all
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/machines', labelKey: 'machines', label: 'Machines', icon: 'Cog' },
  {
    href: '/sop',
    labelKey: 'sop',
    label: 'SOP Library',
    icon: 'FileText',
    roles: ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER', 'QA_OFFICER', 'TRAINER'],
  },
  { href: '/training', labelKey: 'training', label: 'Training', icon: 'GraduationCap' },
  { href: '/simulation', labelKey: 'simulation', label: 'Batch Simulation', icon: 'FlaskConical' },
  {
    href: '/ojt',
    labelKey: 'ojt',
    label: 'OJT Sign-off',
    icon: 'ClipboardCheck',
    roles: ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER', 'QA_OFFICER', 'TRAINER'],
  },
  {
    href: '/capa',
    labelKey: 'capa',
    label: 'CAPA',
    icon: 'AlertTriangle',
    roles: ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER', 'QA_OFFICER'],
  },
  {
    href: '/requalification',
    labelKey: 'requalification',
    label: 'Requalification',
    icon: 'CalendarClock',
    roles: ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER', 'QA_OFFICER'],
  },
  {
    href: '/mock-inspection',
    labelKey: 'mockInspection',
    label: 'Mock Inspection',
    icon: 'ShieldCheck',
    roles: ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER', 'QA_OFFICER'],
  },
  { href: '/audit-trail', labelKey: 'auditTrail', label: 'Audit Trail', icon: 'ScrollText' },
  {
    href: '/reports',
    labelKey: 'reports',
    label: 'Reports',
    icon: 'BarChart3',
    roles: ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER', 'QA_OFFICER'],
  },
  {
    href: '/users',
    labelKey: 'users',
    label: 'Users',
    icon: 'Users',
    roles: ['SUPER_ADMIN', 'ADMIN', 'TRAINING_MANAGER'],
  },
  { href: '/settings', labelKey: 'settings', label: 'Settings', icon: 'Settings' },
];

export function visibleNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

/** Bottom-nav items for mobile (subset). */
export const MOBILE_NAV_KEYS = ['/dashboard', '/machines', '/training', '/simulation', '/capa'];
