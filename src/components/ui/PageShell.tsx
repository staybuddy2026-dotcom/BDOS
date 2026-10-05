import type { LucideIcon } from 'lucide-react';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import blob from '@/assets/blob.png';

/**
 * Standard page frame: a fixed header (icon, title, one-line description, optional actions)
 * above a scrolling body with the breadcrumb. Every page built on it looks and scrolls the same,
 * on phones too.
 */
export function PageShell({ icon: Icon, title, subtitle, badge, actions, breadcrumb, beforeContent, children }: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Small label next to the breadcrumb, e.g. "Team pipeline". */
  badge?: string;
  actions?: React.ReactNode;
  /** Replaces the default breadcrumb (pass `false` for none). */
  breadcrumb?: React.ReactNode | false;
  /** Full-width content above the padded body, e.g. the workflow step bar. */
  beforeContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="dashboard-page flex h-screen flex-col overflow-hidden bg-cover bg-fixed bg-right-top bg-no-repeat"
      style={{ backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})` }}
    >
      <header className="flex min-h-[65px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-white px-7 py-2 max-[768px]:px-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 p-2.5 shadow-[0_4px_16px_rgba(99,102,241,0.3)]">
            <Icon size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="m-0 truncate bg-gradient-to-br from-slate-900 to-blue-500 bg-clip-text text-[1.35rem] font-extrabold text-transparent">{title}</h1>
            {subtitle && <p className="m-0 truncate text-[0.82rem] font-semibold tracking-[0.03em] text-[#8ba0cb]">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>

      <div className="dashboard-scrollable-content relative flex flex-1 flex-col overflow-y-auto">
        {beforeContent}
        <div className="flex flex-1 flex-col gap-4 px-7 pt-4 pb-10 max-[768px]:px-4">
          {breadcrumb === undefined ? <BreadcrumbHeader currentTitle={title} badge={badge} /> : breadcrumb}
          {children}
        </div>
      </div>
    </div>
  );
}
