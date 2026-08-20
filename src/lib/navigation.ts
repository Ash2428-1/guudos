import {
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  Clock,
  Eye,
  FileSignature,
  FileText,
  Home,
  LayoutDashboard,
  type LucideIcon,
  Route,
  ShieldCheck,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { type Capability, type Role } from '@/lib/roles';

/**
 * Client-safe module registry. Drives the home tiles AND the nav bar/rail.
 * Each module declares how it is gated; the shell filters on the resolved
 * session context. `enabled: false` renders a "Coming soon" tile with no link
 * so the build never ships dead routes.
 *
 * `group` splits the app into the two tiers:
 *   - 'on_mobile'  → operational, for MUMs & operators (and everyone above)
 *   - 'management' → reporting & admin, for Regional Managers and above
 */
export type NavGroup = 'on_mobile' | 'management';

export interface NavModule {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group?: NavGroup;
  /** Minimum role to see the tile (default 'staff'). */
  minRole?: Role;
  /** Capability required to see the tile. */
  capability?: Capability;
  /** Show in the bottom nav / left rail (vs home-tiles only). */
  inNav?: boolean;
  /** Built yet? */
  enabled: boolean;
  description: string;
}

export const GROUP_LABELS: Record<NavGroup, string> = {
  on_mobile: 'On the mobile',
  management: 'Management',
};

export const MODULES: NavModule[] = [
  {
    key: 'home',
    label: 'Home',
    href: '/',
    icon: Home,
    inNav: true,
    enabled: true,
    description: 'Your day at a glance',
  },

  // --- On the mobile (MUMs & operators) ---
  {
    key: 'checklists',
    label: 'Checklists',
    href: '/checklists',
    icon: ClipboardCheck,
    group: 'on_mobile',
    inNav: true,
    enabled: true,
    description: 'MUM & Operator checks; flagged items raise tickets',
  },
  {
    key: 'clock',
    label: 'Clock',
    href: '/clock',
    icon: Clock,
    group: 'on_mobile',
    inNav: true,
    enabled: true,
    description: 'Clock in / out of your shift',
  },
  {
    key: 'reports',
    label: 'Daily report',
    href: '/reports',
    icon: FileText,
    group: 'on_mobile',
    minRole: 'supervisor',
    inNav: true,
    enabled: true,
    description: 'Daily mobile report',
  },
  {
    key: 'tickets',
    label: 'Tickets',
    href: '/tickets',
    icon: Ticket,
    group: 'on_mobile',
    minRole: 'supervisor',
    inNav: true,
    enabled: true,
    description: 'Issues raised on your mobile',
  },
  {
    key: 'movement-orders',
    label: 'Movement orders',
    href: '/movement-orders',
    icon: Route,
    group: 'on_mobile',
    minRole: 'supervisor',
    inNav: true,
    enabled: true,
    description: 'Your deployment plans',
  },

  // --- Management (Regional Managers & above) ---
  {
    key: 'overview',
    label: 'Overview',
    href: '/overview',
    icon: BarChart3,
    group: 'management',
    minRole: 'manager',
    inNav: true,
    enabled: true,
    description: 'Completion & tickets across your mobiles',
  },
  {
    key: 'labour',
    label: 'Labour',
    href: '/labour',
    icon: TrendingUp,
    group: 'management',
    capability: 'view_labour',
    inNav: true,
    enabled: true,
    description: 'Lateness, hours & cost of labour',
  },
  {
    key: 'vision',
    label: 'Vision',
    href: '/vision',
    icon: Eye,
    group: 'management',
    capability: 'view_vision',
    inNav: true,
    enabled: true,
    description: 'Spectacles cut vs not cut',
  },
  {
    key: 'assessments',
    label: 'Assessments',
    href: '/assessments',
    icon: LayoutDashboard,
    group: 'management',
    capability: 'view_assessments',
    inNav: true,
    enabled: true,
    description: 'Assessment trackers (Metabase)',
  },
  {
    key: 'work-orders',
    label: 'Work orders',
    href: '/work-orders',
    icon: FileSignature,
    group: 'management',
    minRole: 'manager',
    inNav: true,
    enabled: true,
    description: 'Client work orders (photo/PDF → auto-fill)',
  },
  {
    key: 'schedules',
    label: 'Schedules',
    href: '/schedules',
    icon: CalendarClock,
    group: 'management',
    minRole: 'manager',
    enabled: false,
    description: 'Deployments & staffing',
  },
  {
    key: 'stock',
    label: 'Stock',
    href: '/stock',
    icon: Boxes,
    group: 'management',
    capability: 'view_stock',
    enabled: false,
    description: 'Order stock (Unleashed)',
  },
  {
    key: 'admin',
    label: 'Admin',
    href: '/admin',
    icon: ShieldCheck,
    group: 'management',
    minRole: 'owner',
    inNav: true,
    enabled: true,
    description: 'Org, regions, mobiles & people',
  },
];
