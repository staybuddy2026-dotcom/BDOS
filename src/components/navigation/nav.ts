/** Main navigation, shared by the sidebar and the command palette (Ctrl+K). */
import {
  Search,
  Settings,
  Home,
  Building2,
  Send,
  Target,
  Share2,
  Kanban,
  Users,
  CalendarCheck,
  UserSearch,
  Tags,
  ListChecks,
  TrendingUp,
  BarChart3,
  Store,
  Repeat,
  BookOpen,
  Code,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Extra route prefixes that should also mark this item as active. */
  alsoActiveFor?: string[];
  /** Only shown to admins and managers. */
  managersOnly?: boolean;
  /** Only shown to admins. */
  adminOnly?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
  /** Collapsed until opened (or until one of its pages is open). */
  collapsible?: boolean;
}

// Ordered like the working day: what is due, finding leads, selling to them, then reviewing results.
export const navSections: NavSection[] = [
  {
    label: 'My day',
    items: [
      { name: 'Today', href: '/today', icon: CalendarCheck },
      { name: 'AI Priorities', href: '/priorities', icon: Target },
      { name: 'Dashboard', href: '/dashboard', icon: Home },
    ],
  },
  {
    label: 'Prospecting',
    items: [
      { name: 'Apollo Search', href: '/apollo-search', icon: UserSearch, alsoActiveFor: ['/lead-hub'] },
      { name: 'LinkedIn', href: '/linkedin', icon: Share2 },
      { name: 'Universal Search', href: '/discovery', icon: Search },
      { name: 'Company 360', href: '/company', icon: Building2 },
      { name: 'Keywords', href: '/keywords', icon: Tags },
    ],
  },
  {
    label: 'Selling',
    items: [
      { name: 'Outreach', href: '/engagement', icon: Send },
      { name: 'Review Queue', href: '/review', icon: ListChecks },
      { name: 'CRM Pipeline', href: '/crm', icon: Kanban },
      { name: 'Revenue', href: '/revenue', icon: TrendingUp },
    ],
  },
  {
    label: 'Insights',
    items: [{ name: 'Reports', href: '/reports', icon: BarChart3 }],
  },
  {
    label: 'More tools',
    collapsible: true,
    items: [
      { name: 'Marketplace', href: '/marketplace', icon: Store },
      { name: 'Re-engagement', href: '/re-engagement', icon: Repeat },
      { name: 'Playbooks', href: '/playbooks', icon: BookOpen },
      { name: 'GitHub Signals', href: '/github', icon: Code },
    ],
  },
  {
    label: 'Admin',
    items: [
      { name: 'Team', href: '/team', icon: Users, managersOnly: true },
      { name: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
    ],
  },
];
