import { FollowUpStatus, Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import type { DealStage } from '@prisma/client';
import { db } from '@/lib/db';
import type { UserSession } from '@/lib/auth';
import { STALE_AFTER_DAYS } from '@/features/crm/types';
import { parseFollowUpContent } from '@/features/outreach/sequence';

/**
 * "What do I have to do today?" for one team member: their tasks, deal next actions,
 * outreach stages, meetings and deals going quiet. Used by the Today page, the sidebar
 * badge and the morning summary email.
 */

export type TodayTask = { id: string; title: string; priority: TaskPriority; dueDate: string; overdue: boolean; deal: { id: string; company: string } | null };
export type TodayNextAction = { dealId: string; company: string; stage: DealStage; nextAction: string; dueDate: string; overdue: boolean };
export type TodayFollowUp = {
  id: string;
  draftId: string;
  company: string;
  contactName: string | null;
  toEmail: string | null;
  linkedinUrl: string | null;
  dealId: string | null;
  stage: number | null;
  subject: string;
  body: string;
  channel: string | null;
  dueDate: string;
  overdue: boolean;
  /** AUTO: the app emails it at the due time. MANUAL: the person sends it and marks it as sent. */
  mode: 'AUTO' | 'MANUAL';
  status: FollowUpStatus;
  error: string | null;
};
export type TodayMeeting = { id: string; title: string; startTime: string; company: string; dealId: string | null; meetingUrl: string | null };
export type TodayStaleDeal = { dealId: string; company: string; stage: DealStage; lastActivityAt: string };

export type TodayData = {
  tasks: TodayTask[];
  nextActions: TodayNextAction[];
  followUps: TodayFollowUp[];
  meetings: TodayMeeting[];
  staleDeals: TodayStaleDeal[];
  /** Open leads nobody owns yet. */
  unassignedLeads: number;
  /** Due in the next 7 days (after today). */
  upcoming: { tasks: number; nextActions: number; followUps: number; meetings: number };
  /** Things that need the person to act: shown as the sidebar badge. */
  actionCount: number;
};

const DAY_MS = 86400000;

export function dayBounds(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS - 1);
  return { start, end, weekEnd: new Date(end.getTime() + 7 * DAY_MS) };
}

/** Sequences the user sends. Sequences saved before sequences had owners are looked after by admins. */
const draftScope = (user: UserSession): Prisma.OutreachDraftWhereInput =>
  user.role === 'ADMIN' ? { OR: [{ ownerId: user.id }, { ownerId: null }] } : { ownerId: user.id };

const isAutomatic = (draft: { autoSend: boolean; channel: string | null; toEmail: string | null }) => draft.autoSend && draft.channel === 'EMAIL' && !!draft.toEmail;

const openTask = (userId: string): Prisma.TaskWhereInput => ({ assigneeId: userId, status: { not: TaskStatus.COMPLETED } });
const openDeal = (userId: string): Prisma.DealWhereInput => ({ ownerId: userId, stage: { notIn: ['WON', 'LOST'] } });
/** Due (or failed) stages. A failed stage needs attention whatever its date. */
const dueFollowUp = (user: UserSession, until: Date): Prisma.FollowUpWhereInput => ({
  draft: draftScope(user),
  OR: [{ status: FollowUpStatus.PENDING, dueDate: { lte: until } }, { status: FollowUpStatus.FAILED }],
});

export async function getTodaySummary(user: UserSession, now = new Date()): Promise<TodayData> {
  const { start, end, weekEnd } = dayBounds(now);
  const staleBefore = new Date(now.getTime() - STALE_AFTER_DAYS * DAY_MS);

  const [tasks, nextActions, followUps, meetings, staleDeals, unassignedLeads, upTasks, upActions, upFollowUps, upMeetings] = await Promise.all([
    db.task.findMany({ where: { ...openTask(user.id), dueDate: { lte: end } }, orderBy: [{ dueDate: 'asc' }], take: 100, include: { deal: { select: { id: true, company: { select: { name: true } } } } } }),
    db.deal.findMany({ where: { ...openDeal(user.id), nextActionDate: { lte: end } }, orderBy: { nextActionDate: 'asc' }, take: 100, include: { company: { select: { name: true } } } }),
    db.followUp.findMany({
      where: dueFollowUp(user, end),
      orderBy: { dueDate: 'asc' },
      take: 100,
      include: { draft: { include: { post: { select: { companyName: true, authorName: true } }, deal: { select: { id: true, company: { select: { name: true } }, primaryContact: { select: { linkedinUrl: true } } } } } } },
    }),
    db.meeting.findMany({ where: { deal: { ownerId: user.id }, startTime: { gte: start, lte: end }, status: { not: 'CANCELLED' } }, orderBy: { startTime: 'asc' }, include: { deal: { select: { id: true } } } }),
    db.deal.findMany({ where: { ...openDeal(user.id), lastActivityAt: { lt: staleBefore } }, orderBy: { lastActivityAt: 'asc' }, take: 15, include: { company: { select: { name: true } } } }),
    db.deal.count({ where: { ownerId: null, stage: { notIn: ['WON', 'LOST'] } } }),
    db.task.count({ where: { ...openTask(user.id), dueDate: { gt: end, lte: weekEnd } } }),
    db.deal.count({ where: { ...openDeal(user.id), nextActionDate: { gt: end, lte: weekEnd } } }),
    db.followUp.count({ where: { draft: draftScope(user), status: FollowUpStatus.PENDING, dueDate: { gt: end, lte: weekEnd } } }),
    db.meeting.count({ where: { deal: { ownerId: user.id }, startTime: { gt: end, lte: weekEnd }, status: { not: 'CANCELLED' } } }),
  ]);

  const data: TodayData = {
    tasks: tasks.map((t) => ({
      id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate.toISOString(), overdue: t.dueDate < start,
      deal: t.deal ? { id: t.deal.id, company: t.deal.company.name } : null,
    })),
    nextActions: nextActions.map((d) => ({
      dealId: d.id, company: d.company.name, stage: d.stage, nextAction: d.nextAction || 'Follow up', dueDate: d.nextActionDate!.toISOString(), overdue: d.nextActionDate! < start,
    })),
    followUps: followUps.map((f) => {
      const { stage, subject, body } = parseFollowUpContent(f.content);
      return {
        id: f.id,
        draftId: f.draftId,
        company: f.draft.deal?.company.name || f.draft.post?.companyName || 'Unknown company',
        contactName: f.draft.toName || f.draft.post?.authorName || null,
        toEmail: f.draft.toEmail,
        linkedinUrl: f.draft.deal?.primaryContact?.linkedinUrl ?? null,
        dealId: f.draft.dealId,
        stage,
        subject,
        body,
        channel: f.draft.channel,
        dueDate: f.dueDate.toISOString(),
        overdue: f.dueDate < start,
        mode: isAutomatic(f.draft) ? 'AUTO' : 'MANUAL',
        status: f.status,
        error: f.error,
      };
    }),
    meetings: meetings.map((m) => ({ id: m.id, title: m.title, startTime: m.startTime.toISOString(), company: m.companyName, dealId: m.deal?.id ?? null, meetingUrl: m.meetingUrl })),
    staleDeals: staleDeals.map((d) => ({ dealId: d.id, company: d.company.name, stage: d.stage, lastActivityAt: d.lastActivityAt.toISOString() })),
    unassignedLeads,
    upcoming: { tasks: upTasks, nextActions: upActions, followUps: upFollowUps, meetings: upMeetings },
    actionCount: 0,
  };
  // Automatic emails that are simply waiting for their time need nothing from the person.
  data.actionCount = data.tasks.length + data.nextActions.length + data.followUps.filter((f) => f.mode === 'MANUAL' || f.status === FollowUpStatus.FAILED).length;
  return data;
}

/** The sidebar badge: the same number as `actionCount`, without loading the lists. */
export async function getTodayCount(user: UserSession, now = new Date()): Promise<number> {
  const { end } = dayBounds(now);
  const [tasks, nextActions, followUps] = await Promise.all([
    db.task.count({ where: { ...openTask(user.id), dueDate: { lte: end } } }),
    db.deal.count({ where: { ...openDeal(user.id), nextActionDate: { lte: end } } }),
    db.followUp.findMany({ where: dueFollowUp(user, end), select: { status: true, draft: { select: { autoSend: true, channel: true, toEmail: true } } }, take: 200 }),
  ]);
  return tasks + nextActions + followUps.filter((f) => f.status === FollowUpStatus.FAILED || !isAutomatic(f.draft)).length;
}
