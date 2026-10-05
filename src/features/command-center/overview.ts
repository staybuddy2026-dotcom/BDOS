import type { CrmActivityType, DealStage, LeadSource, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { UserSession } from '@/lib/auth';
import { canSeeAllDeals } from '@/lib/roles';
import { DEAL_STAGES, SOURCE_LABELS, STALE_AFTER_DAYS } from '@/features/crm/types';
import { getTodayCount } from '@/features/today/service';

/**
 * The Dashboard: how the pipeline stands, built from the same CRM deals as the CRM, Today and Reports pages,
 * so every page shows the same numbers. A BDE sees their own deals; managers and admins can switch between
 * the whole team and their own.
 */

export type DashboardScope = 'team' | 'mine';

export type DashboardOverview = {
  scope: DashboardScope;
  canSeeAll: boolean;
  firstName: string;
  kpis: {
    openDeals: number;
    pipelineValue: number;
    weightedValue: number;
    /** Open deals nobody has put a value on yet (they count as $0 above). */
    unvaluedDeals: number;
    newLeads7d: number;
    wonThisMonth: { count: number; value: number };
    /** Won out of closed in the last 90 days; null when nothing closed. */
    winRate90: number | null;
    meetingsThisWeek: number;
    /** The signed-in person's own to-do count for today (same as the sidebar badge). */
    dueToday: number;
    overdueActions: number;
    staleDeals: number;
    unassigned: number;
  };
  stages: { stage: DealStage; label: string; count: number; value: number }[];
  attention: {
    dealId: string;
    company: string;
    stage: DealStage;
    value: number | null;
    owner: string | null;
    reasons: string[];
  }[];
  forecast: {
    /** Open deals expected to close this month, weighted by win chance. */
    thisMonthWeighted: number;
    thisMonthDeals: number;
    wonThisMonth: number;
    weightedPipeline: number;
  };
  sources: { source: LeadSource; label: string; count: number }[];
  activity: { id: string; type: CrmActivityType; title: string; company: string; dealId: string; by: string | null; at: string }[];
};

const DAY_MS = 86400000;
const OPEN: Prisma.DealWhereInput = { stage: { notIn: ['WON', 'LOST'] } };

export async function getDashboardOverview(user: UserSession, requested: DashboardScope = 'team', now = new Date()): Promise<DashboardOverview> {
  const canSeeAll = canSeeAllDeals(user.role);
  const scope: DashboardScope = canSeeAll ? requested : 'mine';
  const owned: Prisma.DealWhereInput = scope === 'team' ? {} : { ownerId: user.id };

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const weekEnd = new Date(todayStart.getTime() + 7 * DAY_MS);
  const staleBefore = new Date(now.getTime() - STALE_AFTER_DAYS * DAY_MS);
  const soon = new Date(todayStart.getTime() + 14 * DAY_MS);

  const [openDeals, won, lost90, newLeads7d, meetingsThisWeek, unassigned, sourceGroups, activity, dueToday] = await Promise.all([
    db.deal.findMany({
      where: { ...owned, ...OPEN },
      select: {
        id: true, stage: true, value: true, probability: true, nextActionDate: true, lastActivityAt: true, expectedCloseDate: true,
        company: { select: { name: true } }, owner: { select: { name: true } },
      },
    }),
    db.deal.findMany({ where: { ...owned, stage: 'WON', closedAt: { gte: new Date(now.getTime() - 90 * DAY_MS) } }, select: { value: true, closedAt: true } }),
    db.deal.count({ where: { ...owned, stage: 'LOST', closedAt: { gte: new Date(now.getTime() - 90 * DAY_MS) } } }),
    db.deal.count({ where: { ...owned, createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
    db.meeting.count({ where: { deal: owned, startTime: { gte: todayStart, lt: weekEnd }, status: { not: 'CANCELLED' } } }),
    db.deal.count({ where: { ownerId: null, ...OPEN } }),
    db.deal.groupBy({ by: ['source'], where: { ...owned, createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } }, _count: { _all: true } }),
    db.crmActivity.findMany({
      where: { deal: owned },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, type: true, title: true, createdAt: true, dealId: true, deal: { select: { company: { select: { name: true } } } }, user: { select: { name: true } } },
    }),
    getTodayCount(user, now),
  ]);

  const weighted = (d: { value: number | null; probability: number }) => ((d.value ?? 0) * d.probability) / 100;
  const wonThisMonth = won.filter((d) => d.closedAt && d.closedAt >= monthStart);
  const closedCount = won.length + lost90;

  const attention = openDeals
    .map((d) => {
      const reasons: string[] = [];
      if (d.nextActionDate && d.nextActionDate < todayStart) reasons.push('Next action overdue');
      if (d.expectedCloseDate && d.expectedCloseDate >= todayStart && d.expectedCloseDate <= soon) {
        const days = Math.round((d.expectedCloseDate.getTime() - todayStart.getTime()) / DAY_MS);
        reasons.push(days === 0 ? 'Expected to close today' : `Expected to close in ${days} day${days === 1 ? '' : 's'}`);
      }
      if (d.lastActivityAt < staleBefore) reasons.push(`Quiet for ${Math.floor((now.getTime() - d.lastActivityAt.getTime()) / DAY_MS)} days`);
      return { d, reasons };
    })
    .filter((x) => x.reasons.length)
    // Most reasons first, then the biggest deals.
    .sort((a, b) => b.reasons.length - a.reasons.length || (b.d.value ?? 0) - (a.d.value ?? 0))
    .slice(0, 8)
    .map(({ d, reasons }) => ({ dealId: d.id, company: d.company.name, stage: d.stage, value: d.value, owner: d.owner?.name ?? null, reasons }));

  const closingThisMonth = openDeals.filter((d) => d.expectedCloseDate && d.expectedCloseDate >= monthStart && d.expectedCloseDate < nextMonthStart);

  return {
    scope,
    canSeeAll,
    firstName: user.name.split(' ')[0] || user.name,
    kpis: {
      openDeals: openDeals.length,
      pipelineValue: openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
      weightedValue: Math.round(openDeals.reduce((sum, d) => sum + weighted(d), 0)),
      unvaluedDeals: openDeals.filter((d) => d.value == null).length,
      newLeads7d,
      wonThisMonth: { count: wonThisMonth.length, value: wonThisMonth.reduce((sum, d) => sum + (d.value ?? 0), 0) },
      winRate90: closedCount ? Math.round((won.length / closedCount) * 100) : null,
      meetingsThisWeek,
      dueToday,
      overdueActions: openDeals.filter((d) => d.nextActionDate && d.nextActionDate < todayStart).length,
      staleDeals: openDeals.filter((d) => d.lastActivityAt < staleBefore).length,
      unassigned,
    },
    stages: DEAL_STAGES.filter((st) => st.id !== 'WON' && st.id !== 'LOST').map((st) => {
      const inStage = openDeals.filter((d) => d.stage === st.id);
      return { stage: st.id, label: st.label, count: inStage.length, value: inStage.reduce((sum, d) => sum + (d.value ?? 0), 0) };
    }),
    attention,
    forecast: {
      thisMonthWeighted: Math.round(closingThisMonth.reduce((sum, d) => sum + weighted(d), 0)),
      thisMonthDeals: closingThisMonth.length,
      wonThisMonth: wonThisMonth.reduce((sum, d) => sum + (d.value ?? 0), 0),
      weightedPipeline: Math.round(openDeals.reduce((sum, d) => sum + weighted(d), 0)),
    },
    sources: sourceGroups
      .map((g) => ({ source: g.source, label: SOURCE_LABELS[g.source], count: g._count._all }))
      .sort((a, b) => b.count - a.count),
    activity: activity.map((a) => ({
      id: a.id, type: a.type, title: a.title, company: a.deal.company.name, dealId: a.dealId, by: a.user?.name ?? null, at: a.createdAt.toISOString(),
    })),
  };
}
