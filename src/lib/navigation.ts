import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  Clock,
  Eye,
  FileText,
  Home,
  LayoutDashboard,
  type LucideIcon,
  ShieldCheck,
  Ticket,
  TrendingUp,
  CalendarClock,
} from 'lucide-react';
import { type Capability, type Role } from '@/lib/roles';

/**
 * Client-safe module registry. Drives the home tiles AND the nav bar/rail.
 * Each module declares how it is gated; the shell filters on the resolved
 * session context. `enabled: false` renders a "Coming soon" tile with no link
 * so the build never ships dead routes.
 */
export interface NavModule {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
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
  {
    key: 'overview',
    label: 'Overview',
    href: '/overview',
    icon: BarChart3,
    minRole: 'supervisor',
    inNav: true,
    enabled: true,
    description: 'Completion & tickets across your mobiles',
  },
  {
    key: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: FileText,
    minRole: 'supervisor',
    inNav: true,
    enabled: true,
    description: 'Daily mobile report-back',
  },
  {
    key: 'checklists',
    label: 'Checklists',
    href: '/checklists',
    icon: ClipboardCheck,
    inNav: true,
    enabled: true,
    description: 'MUM & Operator checks; flagged items raise tickets',
  },
  {
    key: 'clock',
    label: 'Clock',
    href: '/clock',
    icon: Clock,
    inNav: true,
    enabled: true,
    description: 'Clock in / out of your shift',
  },
  {
    key: 'tickets',
    label: 'Tickets',
    href: '/tickets',
    icon: Ticket,
    minRole: 'supervisor',
    inNav: true,
    enabled: true,
    description: 'Issues raised across your mobiles',
  },
  {
    key: 'schedules',
    label: 'Schedules',
    href: '/schedules',
    icon: CalendarClock,
    minRole: 'supervisor',
    enabled: false,
    description: 'Deployments & staffing',
  },
  {
    key: 'labour',
    label: 'Labour',
    href: '/labour',
    icon: TrendingUp,
    capability: 'view_labour',
    inNav: true,
    enabled: true,
    description: 'Lateness, hours & cost of labour',
  },
  {
    key: 'assessments',
    label: 'Assessments',
    href: '/assessments',
    icon: LayoutDashboard,
    capability: 'view_assessments',
    inNav: true,
    enabled: true,
    description: 'Assessment trackers (Metabase)',
  },
  {
    key: 'vision',
    label: 'Vision',
    href: '/vision',
    icon: Eye,
    capability: 'view_vision',
    inNav: true,
    enabled: true,
    description: 'Spectacles cut vs not cut',
  },
  {
    key: 'stock',
    label: 'Stock',
    href: '/stock',
    icon: Boxes,
    capability: 'view_stock',
    enabled: false,
    description: 'Order stock (Unleashed)',
  },
  {
    key: 'admin',
    label: 'Admin',
    href: '/admin',
    icon: ShieldCheck,
    minRole: 'owner',
    inNav: true,
    enabled: true,
    description: 'Org, regions, mobiles & people',
  },
];
