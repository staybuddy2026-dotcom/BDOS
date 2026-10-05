import { CrmActivityType, DraftStatus, Prisma } from '@prisma/client';
import type { DealStage, LeadSource } from '@prisma/client';
import { db } from '@/lib/db';
import type { UserSession } from '@/lib/auth';
import { canSeeAllDeals } from '@/lib/roles';
import { DEAL_STAGES } from '@/features/crm/types';
import { backfillFurthestStage } from '@/features/crm/service';
import type { ActivityBucket, FunnelRow, Report, ReportRange, TeamRow } from './types';

export type { ActivityBucket, FunnelRow, Report, ReportRange, TeamRow } from './types';
export { REPORT_RANGES } from './types';

/**
 * Sales reports computed from the CRM and outreach tables. Managers and admins see the whole
 * team; a BDE sees their own numbers. Every figure is a count or sum of real records in the
 * chosen period; nothing is estimated.
 */

const DAY_MS = 86400000;
const STAGE_INDEX = Object.fromEntries(DEAL_STAGES.map((s, i) => [s.id, i])) as Record<DealStage, number>;

export function rangeStart(range: ReportRange, now = new Date()): Date | null {
  const days = range === '30d' ? 30 : range === '90d' ? 90 : range === '365d' ? 365 : null;
  if (!days) return null;
  const start = new Date(now.getTime() - days * DAY_MS);
  start.setHours(0, 0, 0, 0);
  return start;
}

// Email activity titles that are not something we sent.
const isReply = (title: string) => title.startsWith('Reply received') || title.startsWith('LinkedIn reply received');
const classify = (type: CrmActivityType, title: string): keyof Omit<ActivityBucket, 'start' | 'label'> | null => {
  if (isReply(title)) return 'replies';
  if (type === 'EMAIL') return 'emails';
  if (type === 'LINKEDIN') return 'linkedin';
  if (type === 'CALL' || type === 'MEETING') return 'conversations';
  return null;
};

function buildBuckets(from: Date, now: Date, unit: 'week' | 'month'): ActivityBucket[] {
  const buckets: ActivityBucket[] = [];
  const cursor = new Date(from);
  if (unit === 'week') {
    // Weeks start on Monday.
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  } else {
    cursor.setDate(1);
  }
  cursor.setHours(0, 0, 0, 0);
  const fmt = new Intl.DateTimeFormat('en-GB', unit === 'week' ? { day: 'numeric', month: 'short' } : { month: 'short', year: '2-digit' });
  while (cursor <= now) {
    buckets.push({ start: cursor.toISOString(), label: fmt.format(cursor), emails: 0, linkedin: 0, conversations: 0, replies: 0 });
    if (unit === 'week') cursor.setDate(cursor.getDate() + 7); else cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

export async function getReport(user: UserSession, range: ReportRange, now = new Date()): Promise<Report> {
  await backfillFurthestStage();
  const team = canSeeAllDeals(user.role);
  const from = rangeStart(range, now);
  const inRange = (field: string) => (from ? { [field]: { gte: from } } : {});
  const dealOwner: Prisma.DealWhereInput = team ? {} : { ownerId: user.id };
  const activityOwner: Prisma.CrmActivityWhereInput = team ? {} : { userId: user.id };

  const [created, closed, open, activities, sequences, users] = await Promise.all([
    // Leads that came in during the period, with how far each got.
    db.deal.findMany({
      where: { ...dealOwner, ...inRange('createdAt') },
      select: { id: true, source: true, stage: true, value: true, furthestStage: true },
    }),
    // Deals closed during the period (whenever they were created).
    db.deal.findMany({
      where: { ...dealOwner, stage: { in: ['WON', 'LOST'] }, closedAt: from ? { gte: from } : { not: null } },
      select: { stage: true, value: true, ownerId: true, createdAt: true, closedAt: true, lostReason: true },
    }),
    db.deal.findMany({ where: { ...dealOwner, stage: { notIn: ['WON', 'LOST'] } }, select: { ownerId: true, value: true } }),
    db.crmActivity.findMany({
      where: { ...activityOwner, ...inRange('createdAt'), type: { in: ['EMAIL', 'LINKEDIN', 'CALL', 'MEETING'] } },
      select: { type: true, title: true, createdAt: true, userId: true },
    }),
    db.outreachDraft.findMany({
      where: { ...(team ? {} : { ownerId: user.id }), ...(from ? { sentAt: { gte: from } } : { sentAt: { not: null } }) },
      select: { status: true, stoppedReason: true },
    }),
    team ? db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }) : Promise.resolve([{ id: user.id, name: user.name }]),
  ]);

  // --- Funnel by source -------------------------------------------------------
  // Each column counts the leads that were actually moved to that stage (or further). Won and Lost are
  // outcomes: a deal won straight from Contacted counts under Contacted and Won, not under Meeting or Proposal.
  const furthest = (deal: (typeof created)[number]) => STAGE_INDEX[deal.furthestStage];
  const funnelMap = new Map<LeadSource, FunnelRow>();
  for (const deal of created) {
    const row = funnelMap.get(deal.source) || { source: deal.source, leads: 0, contacted: 0, meeting: 0, proposal: 0, won: 0, lost: 0, wonValue: 0 };
    const reached = furthest(deal);
    row.leads++;
    if (reached >= STAGE_INDEX.CONTACTED) row.contacted++;
    if (reached >= STAGE_INDEX.MEETING_SCHEDULED) row.meeting++;
    if (reached >= STAGE_INDEX.PROPOSAL_SENT) row.proposal++;
    if (deal.stage === 'WON') { row.won++; row.wonValue += deal.value || 0; }
    if (deal.stage === 'LOST') row.lost++;
    funnelMap.set(deal.source, row);
  }
  const funnel = [...funnelMap.values()].sort((a, b) => b.leads - a.leads);

  // --- Activity over time ----------------------------------------------------
  const firstActivity = activities.reduce<Date | null>((min, a) => (!min || a.createdAt < min ? a.createdAt : min), null);
  const bucketFrom = from || firstActivity || new Date(now.getTime() - 90 * DAY_MS);
  const unit: 'week' | 'month' = range === '30d' || range === '90d' ? 'week' : 'month';
  // "All time" shows at most the last two years so the chart stays readable.
  const effectiveFrom = range === 'all' ? new Date(Math.max(bucketFrom.getTime(), now.getTime() - 730 * DAY_MS)) : bucketFrom;
  const buckets = buildBuckets(effectiveFrom, now, unit);
  for (const a of activities) {
    const kind = classify(a.type, a.title);
    if (!kind) continue;
    let index = -1;
    for (let i = buckets.length - 1; i >= 0; i--) if (a.createdAt >= new Date(buckets[i].start)) { index = i; break; }
    if (index >= 0) buckets[index][kind]++;
  }

  // --- Team ----------------------------------------------------------------
  const teamRows: TeamRow[] = users.map((u) => {
    const mineClosed = closed.filter((d) => d.ownerId === u.id);
    const mineOpen = open.filter((d) => d.ownerId === u.id);
    const mineActivities = activities.filter((a) => a.userId === u.id);
    return {
      userId: u.id,
      name: u.name,
      openDeals: mineOpen.length,
      pipelineValue: mineOpen.reduce((s, d) => s + (d.value || 0), 0),
      wonDeals: mineClosed.filter((d) => d.stage === 'WON').length,
      lostDeals: mineClosed.filter((d) => d.stage === 'LOST').length,
      wonValue: mineClosed.filter((d) => d.stage === 'WON').reduce((s, d) => s + (d.value || 0), 0),
      emails: mineActivities.filter((a) => classify(a.type, a.title) === 'emails').length,
      linkedin: mineActivities.filter((a) => classify(a.type, a.title) === 'linkedin').length,
      conversations: mineActivities.filter((a) => classify(a.type, a.title) === 'conversations').length,
    };
  }).sort((a, b) => b.wonValue - a.wonValue || b.wonDeals - a.wonDeals || b.openDeals - a.openDeals);

  // --- Lost reasons ----------------------------------------------------------
  const reasons = new Map<string, number>();
  for (const d of closed.filter((x) => x.stage === 'LOST')) {
    // Stored as "<reason>" or "<reason>: <details>"; group by the reason.
    const reason = (d.lostReason || 'No reason given').split(':')[0].trim() || 'No reason given';
    reasons.set(reason, (reasons.get(reason) || 0) + 1);
  }

  // --- Headline numbers ------------------------------------------------------
  const won = closed.filter((d) => d.stage === 'WON');
  const lost = closed.filter((d) => d.stage === 'LOST');
  const cycleDays = won.filter((d) => d.closedAt).map((d) => (d.closedAt!.getTime() - d.createdAt.getTime()) / DAY_MS);
  const repliedStatuses: DraftStatus[] = ['REPLIED', 'MEETING', 'PROPOSAL', 'WON'];
  const replied = sequences.filter((s) => repliedStatuses.includes(s.status) || /replied/i.test(s.stoppedReason || '')).length;

  return {
    range,
    from: from?.toISOString() ?? null,
    scope: team ? 'team' : 'mine',
    kpis: {
      leads: created.length,
      wonDeals: won.length,
      wonValue: won.reduce((s, d) => s + (d.value || 0), 0),
      winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
      avgDaysToWin: cycleDays.length ? Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) : null,
      emailsSent: activities.filter((a) => classify(a.type, a.title) === 'emails').length,
      replyRate: sequences.length ? Math.round((replied / sequences.length) * 100) : null,
      sequencesStarted: sequences.length,
    },
    funnel,
    activity: { unit, buckets },
    team: teamRows,
    lostReasons: [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  };
}
