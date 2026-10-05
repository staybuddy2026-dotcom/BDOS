'use server';

import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import type { DealStage } from '@prisma/client';
import { AuthService, UserSession } from '@/lib/auth';
import { canSeeAllDeals } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { safeRevalidatePath } from '@/lib/revalidate';
import { db } from '@/lib/db';
import { isValidEmail } from '@/lib/mailer';
import { SettingsService } from '@/lib/settings';
import { apolloProvider, getLastApolloErrors } from '@/features/apollo/provider';
import type { ApolloOrganizationMatch, ApolloPersonMatch } from '@/features/apollo/provider';
import { getUniversalLeadDiscoveryDataAction } from '@/features/discovery/actions';
import {
  advanceDealStage,
  backfillFurthestStage,
  canEditDeal,
  changeDealStage,
  cleanPersonName,
  createLead,
  dealScope,
  findOrCreateContact,
  getAccessibleDeal,
  ignorePostForCrmSync,
  isMaskedName,
  logActivity,
  lookupCrmMatches,
  markDealReplied,
  migrateLegacyCrmStore,
  parseUsdAmount,
  syncReviewPostsToCrm,
} from './service';
import { parseFollowUpContent } from '@/features/outreach/sequence';
import { DEAL_STAGES, LINKEDIN_DAILY_CONNECTION_LIMIT, LINKEDIN_TOUCH_TITLES, STALE_AFTER_DAYS, isClosedStage } from './types';
import type {
  CrmAiBriefing, CrmBoard, CrmFilters, CrmKpis, CrmLookupInput, CrmLookupResult, CrmMatch, DealDetail, DealSummary, LinkedInStatus, LinkedInTouch,
} from './types';

// Mutations return `{ error }` instead of throwing, so the real reason reaches the UI
// (thrown server-action errors are redacted in production).
type Result<T = unknown> = Partial<T> & { error?: string; message?: string };

async function act<T = unknown>(label: string, fn: (user: UserSession) => Promise<Result<NoInfer<T>> | void>): Promise<Result<T>> {
  try {
    const user = await AuthService.verifySession();
    const result = (await fn(user)) || {};
    safeRevalidatePath('/crm');
    safeRevalidatePath('/today');
    return result as Result<T>;
  } catch (err) {
    if (err instanceof AppError) return { error: err.message } as Result<T>;
    logger.error(`CRM action failed: ${label}`, err);
    return { error: 'Something went wrong. Please try again.' } as Result<T>;
  }
}

const STAGE_IDS = DEAL_STAGES.map((s) => s.id);
const DAY_MS = 86400000;
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const parseDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const summaryInclude = {
  company: true,
  primaryContact: true,
  owner: { select: { id: true, name: true } },
  _count: { select: { tasks: { where: { status: { not: TaskStatus.COMPLETED } } } } },
} satisfies Prisma.DealInclude;

type DealWithSummary = Prisma.DealGetPayload<{ include: typeof summaryInclude }>;

function toSummary(deal: DealWithSummary): DealSummary {
  const open = !isClosedStage(deal.stage);
  const now = Date.now();
  return {
    id: deal.id,
    title: deal.title,
    stage: deal.stage,
    value: deal.value,
    probability: deal.probability,
    source: deal.source,
    company: { id: deal.company.id, name: deal.company.name, domain: deal.company.domain, industry: deal.company.industry, location: deal.company.location },
    primaryContact: deal.primaryContact
      ? { id: deal.primaryContact.id, name: deal.primaryContact.name, title: deal.primaryContact.title, email: deal.primaryContact.email }
      : null,
    owner: deal.owner,
    nextAction: deal.nextAction,
    nextActionDate: iso(deal.nextActionDate),
    lastActivityAt: deal.lastActivityAt.toISOString(),
    stageChangedAt: deal.stageChangedAt.toISOString(),
    createdAt: deal.createdAt.toISOString(),
    openTasks: deal._count.tasks,
    isOverdue: open && !!deal.nextActionDate && deal.nextActionDate.getTime() < now - DAY_MS,
    isStale: open && now - deal.lastActivityAt.getTime() > STALE_AFTER_DAYS * DAY_MS,
  };
}

function computeKpis(deals: DealSummary[]): CrmKpis {
  const open = deals.filter((d) => !isClosedStage(d.stage));
  const won = deals.filter((d) => d.stage === 'WON');
  const lost = deals.filter((d) => d.stage === 'LOST');
  const sum = (list: DealSummary[], weight = false) => Math.round(list.reduce((acc, d) => acc + ((d.value || 0) * (weight ? d.probability : 100)) / 100, 0));
  return {
    openDeals: open.length,
    pipelineValue: sum(open),
    weightedValue: sum(open, true),
    wonDeals: won.length,
    wonValue: sum(won),
    lostDeals: lost.length,
    winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
    overdueActions: open.filter((d) => d.isOverdue).length,
    staleDeals: open.filter((d) => d.isStale).length,
    unassigned: open.filter((d) => !d.owner).length,
  };
}

/** Everything the CRM page needs: the user's deals, KPIs and the team list for assignment. */
export async function getCrmBoard(filters: CrmFilters = {}): Promise<CrmBoard> {
  const user = await AuthService.verifySession();

  // Housekeeping before reading; a failure here must not block the board.
  await migrateLegacyCrmStore().catch((err) => logger.error('Old CRM store migration failed', err));
  await syncReviewPostsToCrm().catch((err) => logger.error('Review Queue to CRM sync failed', err));
  await backfillFurthestStage().catch((err) => logger.error('Furthest-stage backfill failed', err));

  const canSeeAll = canSeeAllDeals(user.role);
  const scope = dealScope(user);
  const [all, team] = await Promise.all([
    db.deal.findMany({ where: scope, include: summaryInclude, orderBy: { lastActivityAt: 'desc' }, take: 2000 }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
  ]);
  const summaries = all.map(toSummary);

  const q = filters.search?.trim().toLowerCase();
  const deals = summaries.filter((d) => {
    if (filters.owner === 'unassigned' ? d.owner : filters.owner && d.owner?.id !== filters.owner) return false;
    if (filters.source && d.source !== filters.source) return false;
    if (!q) return true;
    return [d.title, d.company.name, d.company.domain, d.company.industry, d.primaryContact?.name, d.primaryContact?.email, d.nextAction]
      .some((v) => v?.toLowerCase().includes(q));
  });

  return { deals, kpis: computeKpis(summaries), team, me: { id: user.id, name: user.name, role: user.role }, canSeeAll };
}

export async function getDealDetail(dealId: string): Promise<DealDetail | null> {
  const user = await AuthService.verifySession();
  const deal = await db.deal.findFirst({
    where: { id: dealId, ...dealScope(user) },
    include: {
      ...summaryInclude,
      company: { include: { contacts: { orderBy: { createdAt: 'asc' } } } },
      activities: { orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { name: true } } } },
      tasks: { orderBy: [{ status: 'asc' }, { dueDate: 'asc' }], include: { assignee: { select: { name: true } } } },
      meetings: { orderBy: { startTime: 'desc' } },
      proposals: { orderBy: { createdAt: 'desc' } },
      outreachDrafts: { where: { followUps: { some: {} } }, orderBy: { createdAt: 'desc' }, include: { owner: { select: { name: true } }, followUps: { orderBy: { dueDate: 'asc' } } } },
    },
  });
  if (!deal) return null;

  const [touches, linkedinConnectionsToday] = await Promise.all([
    db.crmActivity.findMany({ where: { dealId: deal.id, type: 'LINKEDIN', contactId: { not: null } }, select: { contactId: true, title: true } }),
    countConnectionRequestsToday(user.id),
  ]);
  // The furthest LinkedIn touch logged for a contact is their status.
  const linkedinStatus = (contactId: string): LinkedInStatus => {
    const mine = touches.filter((t) => t.contactId === contactId).map((t) => t.title);
    const has = (touch: LinkedInTouch) => mine.some((title) => title.startsWith(LINKEDIN_TOUCH_TITLES[touch]));
    if (has('REPLY_RECEIVED')) return 'REPLIED';
    if (has('MESSAGE_SENT')) return 'MESSAGED';
    if (has('CONNECTION_ACCEPTED')) return 'CONNECTED';
    if (has('CONNECTION_SENT')) return 'REQUEST_SENT';
    return 'NOT_CONNECTED';
  };

  const summary = toSummary(deal);
  return {
    ...summary,
    company: {
      ...summary.company,
      linkedinUrl: deal.company.linkedinUrl,
      employeeCount: deal.company.employeeCount,
      revenue: deal.company.revenue,
      technologies: deal.company.technologies,
      tags: deal.company.tags,
    },
    contacts: deal.company.contacts.map((c) => ({
      id: c.id, name: c.name, title: c.title, email: c.email, phone: c.phone, linkedinUrl: c.linkedinUrl, sourcePostUrl: c.sourcePostUrl,
      apolloLinked: !!c.apolloPersonId,
      linkedinStatus: linkedinStatus(c.id),
    })),
    activities: deal.activities.map((a) => ({ id: a.id, type: a.type, title: a.title, details: a.details, createdAt: a.createdAt.toISOString(), userName: a.user?.name ?? null })),
    tasks: deal.tasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate.toISOString(), completed: t.status === TaskStatus.COMPLETED, assigneeName: t.assignee?.name ?? t.assignedOwner })),
    meetings: deal.meetings.map((m) => ({ id: m.id, title: m.title, startTime: m.startTime.toISOString(), attendees: m.attendees, notes: m.notes, meetingUrl: m.meetingUrl })),
    proposals: deal.proposals.map((p) => ({ id: p.id, title: p.title, amount: p.amount, stage: p.stage, validUntil: iso(p.validUntil), createdAt: p.createdAt.toISOString() })),
    sequences: deal.outreachDrafts.map((d) => ({
      draftId: d.id,
      channel: d.channel,
      autoSend: d.autoSend,
      toEmail: d.toEmail,
      ownerName: d.owner?.name ?? null,
      stoppedReason: d.stoppedReason,
      steps: d.followUps.map((f) => {
        const parsed = parseFollowUpContent(f.content);
        return { id: f.id, stage: parsed.stage, subject: parsed.subject, dueDate: f.dueDate.toISOString(), status: f.status, sentAt: iso(f.sentAt), error: f.error };
      }),
    })),
    lostReason: deal.lostReason,
    expectedCloseDate: iso(deal.expectedCloseDate),
    canEdit: canEditDeal(user, deal),
    linkedinConnectionsToday,
  };
}

function countConnectionRequestsToday(userId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return db.crmActivity.count({ where: { userId, type: 'LINKEDIN', title: { startsWith: LINKEDIN_TOUCH_TITLES.CONNECTION_SENT }, createdAt: { gte: startOfDay } } });
}

// ---------------------------------------------------------------------------
// Creating leads
// ---------------------------------------------------------------------------

const existingDealMessage = (result: { companyName: string; ownerName: string | null; claimed: boolean }, withContact = true) =>
  result.claimed
    ? `${result.companyName} already had an unassigned deal. It is now yours${withContact ? ' and the contact was added to it' : ''}.`
    : `${result.companyName} already has an open deal (${result.ownerName ? `owner: ${result.ownerName}` : 'unassigned'}).${withContact ? ' The contact was added there.' : ''}`;

/** Adds a lead by hand: company, first contact and the deal. */
export async function createDealAction(input: {
  companyName: string;
  domain?: string;
  industry?: string;
  location?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedin?: string;
  value?: number | null;
  stage?: DealStage;
  ownerId?: string | null;
}): Promise<Result<{ dealId: string }>> {
  return act<{ dealId: string }>('createDeal', async (user) => {
    if (!input.companyName?.trim()) return { error: 'Enter the company name.' };
    if (input.contactEmail?.trim() && !isValidEmail(input.contactEmail)) return { error: 'The contact email address is not valid.' };
    if (input.stage && !STAGE_IDS.includes(input.stage)) return { error: 'Choose a valid stage.' };
    if (input.stage === 'LOST') return { error: 'A new lead cannot start as Lost.' };

    // Only admins and managers can create a lead for someone else.
    const ownerId = canSeeAllDeals(user.role) && input.ownerId !== undefined ? input.ownerId : user.id;
    const result = await createLead({
      company: { name: input.companyName, domain: input.domain, industry: input.industry, location: input.location },
      contact: input.contactName?.trim()
        ? { name: input.contactName, title: input.contactTitle, email: input.contactEmail, phone: input.contactPhone, linkedinUrl: input.contactLinkedin }
        : null,
      value: input.value,
      stage: input.stage,
      source: 'MANUAL',
      ownerId,
      actorId: user.id,
    });
    return {
      dealId: result.dealId,
      message: result.created ? `${result.companyName} added to the pipeline.` : existingDealMessage(result),
    };
  });
}

/**
 * Import and sync high-intent Apollo & discovery leads into the CRM (up to 6 new leads per run).
 */
export async function importLeadsFromDiscovery(): Promise<Result<{ count: number }>> {
  return act<{ count: number }>('importLeadsFromDiscovery', async (user) => {
    const discoveryData = await getUniversalLeadDiscoveryDataAction(
      '',
      { apollo: true, github: true, crunchbase: true, producthunt: true, reddit: true, linkedin: true },
      1,
      25
    );
    const leads = (discoveryData.leads || []).filter((l) => l.companyName?.trim());
    if (!leads.length) return { count: 0, message: discoveryData.apiError || 'No discovery leads are available to import right now.' };

    let count = 0;
    for (const lead of leads) {
      if (count >= 6) break;
      const result = await createLead({
        company: { name: lead.companyName, domain: lead.domain, industry: lead.industry, location: lead.country, employeeCount: lead.employeeCount, technologies: lead.primaryTechStack },
        contact: lead.recommendedContactName && !/^decision maker$/i.test(lead.recommendedContactName)
          ? { name: lead.recommendedContactName, title: lead.recommendedContactTitle, email: lead.contactEmail, phone: lead.contactPhone, linkedinUrl: lead.contactLinkedinUrl }
          : null,
        source: lead.matchedProviders?.includes('apollo') ? 'APOLLO' : 'DISCOVERY',
        ownerId: user.id,
        actorId: user.id,
        note: { title: 'Imported from Universal Search', details: lead.whyContactReason },
      });
      if (result.created) count++;
    }
    return {
      count,
      message: count ? `Imported ${count} new lead${count === 1 ? '' : 's'} into your pipeline.` : `All ${leads.length} discovered leads are already in the CRM.`,
    };
  });
}

/**
 * Create a new CRM deal directly from a Marketplace opportunity.
 */
export async function createCrmDealFromMarketplaceOpportunity(data: {
  projectTitle: string;
  clientCountry: string;
  budget: string;
  technologyStack: string[];
  projectUrl: string;
}) {
  const user = await AuthService.verifySession();
  try {
    const title = data.projectTitle?.trim() || 'Marketplace opportunity';
    const result = await createLead({
      // A marketplace posting has no company yet, so the project itself is the account until the client is known.
      company: { name: title.length > 60 ? `${title.slice(0, 60)}…` : title, location: data.clientCountry, technologies: data.technologyStack, tags: ['Marketplace'] },
      title,
      value: parseUsdAmount(data.budget),
      source: 'MARKETPLACE',
      sourceRef: data.projectUrl || null,
      ownerId: user.id,
      actorId: user.id,
      note: { title: 'Imported from a Marketplace opportunity', details: [data.projectUrl, data.budget && `Budget: ${data.budget}`].filter(Boolean).join(' · ') },
    });
    safeRevalidatePath('/crm');
    return {
      success: true,
      dealId: result.dealId,
      message: result.created ? `Added "${title.slice(0, 40)}" to your CRM pipeline.` : 'This opportunity is already in the CRM.',
    };
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { success: true, dealId: undefined, message: 'This opportunity is already in the CRM.' };
    }
    logger.error('Failed to create CRM deal from marketplace opportunity', err);
    throw new AppError('Failed to create CRM deal.', 500);
  }
}

/** Creates a deal for a researched company (Company 360). */
export async function createCrmDealForCompany(data: { companyName: string; domain?: string; title?: string; location?: string; industry?: string; technologies?: string[] }) {
  const user = await AuthService.verifySession();
  try {
    const result = await createLead({
      company: { name: data.companyName, domain: data.domain, location: data.location, industry: data.industry, technologies: data.technologies },
      title: data.title,
      source: 'COMPANY360',
      ownerId: user.id,
      actorId: user.id,
      note: { title: 'Created from Company 360' },
    });
    safeRevalidatePath('/crm');
    return { success: true, dealId: result.dealId, created: result.created, ownerName: result.ownerName };
  } catch (err) {
    logger.error('Failed to create CRM deal from Company 360', err);
    throw new AppError('Failed to create CRM deal.', 500);
  }
}

/** Adds a person found on LinkedIn to the CRM as a new lead (or attaches them to their company's open deal). */
export async function addLinkedInProfileToCrm(profile: {
  fullName: string;
  profileUrl: string;
  headline?: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
  email?: string;
}): Promise<{ account?: { id: string; name: string }; created: boolean; error?: string }> {
  const user = await AuthService.verifySession();
  if (!profile?.fullName || !/^https:\/\/([a-z]+\.)?linkedin\.com\/in\//i.test(profile.profileUrl || '')) {
    return { created: false, error: 'A name and a LinkedIn profile URL are required.' };
  }
  try {
    const result = await createLead({
      company: { name: profile.companyName?.trim() || `${profile.fullName} (independent)`, location: profile.location },
      contact: { name: profile.fullName, title: profile.jobTitle || profile.headline, email: profile.email, linkedinUrl: profile.profileUrl },
      source: 'LINKEDIN_PEOPLE',
      ownerId: user.id,
      actorId: user.id,
      note: { title: 'Added from LinkedIn people search', details: profile.headline || profile.jobTitle },
    });
    safeRevalidatePath('/crm');
    return { account: { id: result.dealId, name: result.companyName }, created: result.created };
  } catch (err) {
    logger.error('Failed to add LinkedIn profile to CRM', err);
    return { created: false, error: 'Could not add this person to the CRM. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// Updating deals
// ---------------------------------------------------------------------------

export async function updateDealStageAction(dealId: string, stage: DealStage, lostReason?: string): Promise<Result> {
  return act('updateDealStage', async (user) => {
    if (!STAGE_IDS.includes(stage)) return { error: 'Choose a valid stage.' };
    if (stage === 'LOST' && !lostReason?.trim()) return { error: 'Add the reason this deal was lost.' };
    const deal = await getAccessibleDeal(user, dealId);
    await db.$transaction((tx) => changeDealStage(tx, deal, stage, { userId: user.id, lostReason: lostReason?.trim() }));
    return {};
  });
}

/**
 * Closes a deal as won with the handoff details the delivery team needs: the final value, when work
 * starts, who to talk to and what was sold. The handoff is kept on the deal's timeline.
 */
export async function markDealWonAction(dealId: string, handoff: {
  value?: number | null;
  startDate?: string | null;
  clientContact?: string;
  scope?: string;
}): Promise<Result> {
  return act('markDealWon', async (user) => {
    const deal = await getAccessibleDeal(user, dealId);
    if (deal.stage === 'WON') return { error: 'This deal is already won.' };
    if (handoff.value != null && (!Number.isFinite(handoff.value) || handoff.value < 0)) return { error: 'Enter a valid final value.' };
    const scope = handoff.scope?.trim() || '';
    if (!scope) return { error: 'Describe what was sold, so delivery knows what to build.' };

    const value = handoff.value != null ? Math.round(handoff.value) : deal.value;
    const start = parseDate(handoff.startDate);
    const lines = [
      `Final value: ${value != null ? `$${value.toLocaleString('en-US')}` : 'not set'}`,
      `Start date: ${start ? start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'not agreed yet'}`,
      `Client contact: ${handoff.clientContact?.trim() || 'not set'}`,
      `Scope: ${scope}`,
    ];

    await db.$transaction(async (tx) => {
      if (value !== deal.value) await tx.deal.update({ where: { id: deal.id }, data: { value } });
      await changeDealStage(tx, deal, 'WON', { userId: user.id });
      await logActivity(tx, { dealId: deal.id, type: 'NOTE', title: 'Won: handoff to delivery', details: lines.join('\n').slice(0, 5000), userId: user.id });
    });
    return { message: `${deal.company.name} is won. The handoff is saved on the deal.` };
  });
}

export async function updateDealAction(dealId: string, patch: {
  title?: string;
  value?: number | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  expectedCloseDate?: string | null;
}): Promise<Result> {
  return act('updateDeal', async (user) => {
    const deal = await getAccessibleDeal(user, dealId);
    if (patch.title !== undefined && !patch.title.trim()) return { error: 'The deal title cannot be empty.' };
    if (patch.value != null && (!Number.isFinite(patch.value) || patch.value < 0)) return { error: 'Enter a valid deal value.' };

    const data: Prisma.DealUpdateInput = {};
    if (patch.title !== undefined) data.title = patch.title.trim();
    if (patch.value !== undefined) data.value = patch.value ? Math.round(patch.value) : null;
    if (patch.nextAction !== undefined) data.nextAction = patch.nextAction?.trim() || null;
    if (patch.nextActionDate !== undefined) data.nextActionDate = parseDate(patch.nextActionDate);
    if (patch.expectedCloseDate !== undefined) data.expectedCloseDate = parseDate(patch.expectedCloseDate);

    await db.$transaction(async (tx) => {
      await tx.deal.update({ where: { id: deal.id }, data });
      if (patch.value !== undefined && (patch.value || null) !== deal.value) {
        await logActivity(tx, { dealId: deal.id, type: 'SYSTEM', title: patch.value ? `Deal value set to $${Math.round(patch.value).toLocaleString('en-US')}` : 'Deal value cleared', userId: user.id });
      }
      if (patch.nextAction !== undefined && patch.nextAction?.trim() && patch.nextAction.trim() !== deal.nextAction) {
        await logActivity(tx, { dealId: deal.id, type: 'SYSTEM', title: `Next action: ${patch.nextAction.trim()}`, userId: user.id });
      }
    });
    return {};
  });
}

/**
 * Assigns deals to a team member. A BDE can claim an unassigned lead or release their own;
 * admins and managers can assign any deal to anyone.
 */
export async function assignDealsAction(dealIds: string[], ownerId: string | null): Promise<Result<{ count: number }>> {
  return act<{ count: number }>('assignDeals', async (user) => {
    const ids = Array.from(new Set(dealIds || [])).slice(0, 200);
    if (!ids.length) return { count: 0 };
    const manager = canSeeAllDeals(user.role);
    if (!manager && ownerId !== null && ownerId !== user.id) return { error: 'You can only assign leads to yourself.' };

    const owner = ownerId ? await db.user.findFirst({ where: { id: ownerId, isActive: true }, select: { id: true, name: true } }) : null;
    if (ownerId && !owner) return { error: 'That team member is not active.' };

    const deals = await db.deal.findMany({ where: { id: { in: ids }, ...dealScope(user) }, select: { id: true, ownerId: true } });
    // A BDE may take unassigned leads and release their own, never someone else's.
    const allowed = deals.filter((d) => d.ownerId !== ownerId && (manager || d.ownerId === null || d.ownerId === user.id));
    if (!allowed.length) return { error: 'None of these leads can be reassigned by you.' };

    await db.$transaction(async (tx) => {
      for (const d of allowed) {
        await tx.deal.update({ where: { id: d.id }, data: { ownerId } });
        await logActivity(tx, { dealId: d.id, type: 'SYSTEM', title: owner ? (owner.id === user.id ? `Claimed by ${owner.name}` : `Assigned to ${owner.name}`) : 'Returned to the unassigned pool', userId: user.id });
      }
    });
    return { count: allowed.length };
  });
}

/** Moves several deals to a stage at once (from the table view). */
export async function bulkUpdateStageAction(dealIds: string[], stage: DealStage, lostReason?: string): Promise<Result<{ count: number }>> {
  return act<{ count: number }>('bulkUpdateStage', async (user) => {
    if (!STAGE_IDS.includes(stage)) return { error: 'Choose a valid stage.' };
    if (stage === 'LOST' && !lostReason?.trim()) return { error: 'Add the reason these deals were lost.' };
    const deals = (await db.deal.findMany({ where: { id: { in: (dealIds || []).slice(0, 200) }, ...dealScope(user) } })).filter((d) => canEditDeal(user, d));
    if (!deals.length) return { error: 'None of these deals can be edited by you. Claim unassigned leads first.' };
    await db.$transaction(async (tx) => {
      for (const d of deals) await changeDealStage(tx, d, stage, { userId: user.id, lostReason: lostReason?.trim() });
    });
    return { count: deals.length };
  });
}

/** Deletes deals. A BDE can delete only their own; a company left without deals is removed with its contacts. */
export async function deleteDealsAction(dealIds: string[]): Promise<Result<{ count: number }>> {
  return act<{ count: number }>('deleteDeals', async (user) => {
    const deals = (await db.deal.findMany({ where: { id: { in: (dealIds || []).slice(0, 200) }, ...dealScope(user) } })).filter((d) => canEditDeal(user, d));
    if (!deals.length) return { error: 'None of these deals can be deleted by you.' };

    await db.deal.deleteMany({ where: { id: { in: deals.map((d) => d.id) } } });
    await db.company.deleteMany({ where: { id: { in: deals.map((d) => d.companyId) }, deals: { none: {} } } });
    // Leads that came from the Review Queue would otherwise be re-created by the next sync.
    for (const d of deals) if (d.source === 'LINKEDIN_POST' && d.sourceRef) await ignorePostForCrmSync(d.sourceRef);
    return { count: deals.length };
  });
}

// ---------------------------------------------------------------------------
// Timeline: notes, tasks, meetings, proposals
// ---------------------------------------------------------------------------

export async function addDealNoteAction(dealId: string, text: string, type: 'NOTE' | 'CALL' = 'NOTE'): Promise<Result> {
  return act('addDealNote', async (user) => {
    if (!text?.trim()) return { error: 'Write a note first.' };
    const deal = await getAccessibleDeal(user, dealId);
    await logActivity(db, { dealId: deal.id, type, title: type === 'CALL' ? 'Call logged' : 'Note', details: text.trim().slice(0, 5000), userId: user.id });
    return {};
  });
}

export async function addDealTaskAction(dealId: string, input: { title: string; priority: TaskPriority; dueDate: string; assigneeId?: string }): Promise<Result> {
  return act('addDealTask', async (user) => {
    const dueDate = parseDate(input.dueDate);
    if (!input.title?.trim()) return { error: 'Enter what needs to be done.' };
    if (!dueDate) return { error: 'Pick a due date.' };
    const deal = await getAccessibleDeal(user, dealId);
    const assignee = await db.user.findFirst({ where: { id: input.assigneeId || deal.ownerId || user.id, isActive: true }, select: { id: true, name: true } });

    await db.$transaction(async (tx) => {
      await tx.task.create({
        data: {
          title: input.title.trim(),
          priority: Object.values(TaskPriority).includes(input.priority) ? input.priority : TaskPriority.NORMAL,
          dueDate,
          linkedOpportunity: deal.company.name,
          assignedOwner: assignee?.name || user.name,
          assigneeId: assignee?.id || user.id,
          dealId: deal.id,
        },
      });
      await logActivity(tx, { dealId: deal.id, type: 'TASK', title: `Task added: ${input.title.trim()}`, details: `Due ${dueDate.toISOString().slice(0, 10)}`, userId: user.id });
    });
    return {};
  });
}

export async function toggleDealTaskAction(taskId: string): Promise<Result> {
  return act('toggleDealTask', async (user) => {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task?.dealId) return { error: 'Task not found.' };
    const deal = await getAccessibleDeal(user, task.dealId);
    const completed = task.status !== TaskStatus.COMPLETED;
    await db.$transaction(async (tx) => {
      await tx.task.update({ where: { id: task.id }, data: { status: completed ? TaskStatus.COMPLETED : TaskStatus.PENDING, completedAt: completed ? new Date() : null } });
      await logActivity(tx, { dealId: deal.id, type: 'TASK', title: `${completed ? 'Task completed' : 'Task reopened'}: ${task.title}`, userId: user.id });
    });
    return {};
  });
}

export async function addDealMeetingAction(dealId: string, input: { title: string; startTime: string; attendees?: string[]; notes?: string; meetingUrl?: string }): Promise<Result> {
  return act('addDealMeeting', async (user) => {
    const startTime = parseDate(input.startTime);
    if (!input.title?.trim()) return { error: 'Enter a meeting title.' };
    if (!startTime) return { error: 'Pick the meeting date and time.' };
    if (input.meetingUrl?.trim() && !/^https?:\/\//i.test(input.meetingUrl.trim())) return { error: 'The meeting link must start with http:// or https://.' };

    const deal = await db.deal.findUnique({ where: { id: (await getAccessibleDeal(user, dealId)).id }, include: { company: true, primaryContact: true } });
    if (!deal) return { error: 'Deal not found.' };
    const upcoming = startTime.getTime() > Date.now();

    await db.$transaction(async (tx) => {
      await tx.meeting.create({
        data: {
          title: input.title.trim(),
          startTime,
          clientName: deal.primaryContact?.name || deal.company.name,
          clientEmail: deal.primaryContact?.email,
          companyName: deal.company.name,
          meetingUrl: input.meetingUrl?.trim() || null,
          status: upcoming ? 'SCHEDULED' : 'COMPLETED',
          notes: input.notes?.trim() || null,
          attendees: (input.attendees || []).map((a) => a.trim()).filter(Boolean),
          dealId: deal.id,
        },
      });
      await logActivity(tx, { dealId: deal.id, type: 'MEETING', title: `${upcoming ? 'Meeting scheduled' : 'Meeting logged'}: ${input.title.trim()}`, details: input.notes?.trim(), userId: user.id });
      await advanceDealStage(tx, deal, 'MEETING_SCHEDULED', { userId: user.id, reason: 'A meeting was added.' });
    });
    return {};
  });
}

export async function addDealProposalAction(dealId: string, input: { title: string; amount?: number | null; validUntil?: string; scope?: string }): Promise<Result> {
  return act('addDealProposal', async (user) => {
    if (!input.title?.trim()) return { error: 'Enter a proposal title or version.' };
    if (input.amount != null && (!Number.isFinite(input.amount) || input.amount < 0)) return { error: 'Enter a valid proposal amount.' };
    const deal = await db.deal.findUnique({ where: { id: (await getAccessibleDeal(user, dealId)).id }, include: { company: true, primaryContact: true } });
    if (!deal) return { error: 'Deal not found.' };
    const amount = input.amount ? Math.round(input.amount) : null;

    await db.$transaction(async (tx) => {
      await tx.proposal.create({
        data: {
          title: input.title.trim(),
          clientName: deal.primaryContact?.name || deal.company.name,
          companyName: deal.company.name,
          budget: amount ? `$${amount.toLocaleString('en-US')}` : 'Not specified',
          stage: 'SENT',
          probability: deal.probability,
          scope: input.scope?.trim() || null,
          validUntil: parseDate(input.validUntil),
          version: input.title.trim(),
          amount,
          dealId: deal.id,
        },
      });
      // The proposal amount is the best estimate of the deal size when none was entered.
      if (amount && !deal.value) await tx.deal.update({ where: { id: deal.id }, data: { value: amount } });
      await logActivity(tx, { dealId: deal.id, type: 'PROPOSAL', title: `Proposal sent: ${input.title.trim()}`, details: amount ? `Amount: $${amount.toLocaleString('en-US')}` : null, userId: user.id });
      await advanceDealStage(tx, deal, 'PROPOSAL_SENT', { userId: user.id, reason: 'A proposal was sent.' });
    });
    return {};
  });
}

/**
 * Records that a contact replied by email. The reply itself lives in the mailbox; logging it here
 * stops any scheduled follow-ups for the deal and moves a new lead to Contacted.
 */
export async function logEmailReplyAction(dealId: string, contactId: string, note?: string): Promise<Result> {
  return act('logEmailReply', async (user) => {
    const deal = await getAccessibleDeal(user, dealId);
    const contact = await db.contact.findFirst({ where: { id: contactId, companyId: deal.companyId } });
    if (!contact) return { error: 'Contact not found.' };

    await db.$transaction(async (tx) => {
      await logActivity(tx, { dealId: deal.id, type: 'EMAIL', title: `Reply received from ${contact.name}`, details: note?.trim().slice(0, 5000), userId: user.id, contactId: contact.id });
      await advanceDealStage(tx, deal, 'CONTACTED', { userId: user.id, reason: 'The prospect replied.' });
      await markDealReplied(tx, deal.id, `${contact.name} replied by email`, user.id);
    });
    return { message: `Reply logged. Scheduled follow-ups for ${deal.company.name} are stopped.` };
  });
}

/** Ticks off a deal's next action: it is recorded on the timeline and cleared, ready for the next one. */
export async function completeNextActionAction(dealId: string): Promise<Result> {
  return act('completeNextAction', async (user) => {
    const deal = await getAccessibleDeal(user, dealId);
    if (!deal.nextAction && !deal.nextActionDate) return {};
    await db.$transaction(async (tx) => {
      await tx.deal.update({ where: { id: deal.id }, data: { nextAction: null, nextActionDate: null } });
      await logActivity(tx, { dealId: deal.id, type: 'TASK', title: `Done: ${deal.nextAction || 'next action'}`, userId: user.id });
    });
    return {};
  });
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const PROFILE_URL = /^https:\/\/([a-z]+\.)?linkedin\.com\/in\/[^/]+\/?$/i;

/** Adds a contact to the deal's company, or edits one when `contactId` is given. */
export async function saveDealContactAction(dealId: string, contactId: string | null, input: { name: string; title?: string; email?: string; phone?: string; linkedinUrl?: string }): Promise<Result> {
  return act('saveDealContact', async (user) => {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase() || null;
    const linkedinUrl = input.linkedinUrl?.trim().split('?')[0] || null;
    if (!name) return { error: 'Enter the contact\'s name.' };
    if (email && !isValidEmail(email)) return { error: 'The email address is not valid.' };
    if (linkedinUrl && !PROFILE_URL.test(linkedinUrl)) return { error: 'Enter a LinkedIn profile URL like https://www.linkedin.com/in/username' };

    const deal = await getAccessibleDeal(user, dealId);
    if (contactId) {
      const contact = await db.contact.findFirst({ where: { id: contactId, companyId: deal.companyId } });
      if (!contact) return { error: 'Contact not found.' };
      await db.contact.update({ where: { id: contact.id }, data: { name, title: input.title?.trim() || null, email, phone: input.phone?.trim() || null, linkedinUrl } });
      return {};
    }

    await db.$transaction(async (tx) => {
      const { contact, created } = await findOrCreateContact(tx, deal.companyId, { name, title: input.title, email, phone: input.phone, linkedinUrl });
      if (!deal.primaryContactId) await tx.deal.update({ where: { id: deal.id }, data: { primaryContactId: contact.id } });
      if (created) await logActivity(tx, { dealId: deal.id, type: 'SYSTEM', title: `Contact added: ${contact.name}`, details: contact.title, userId: user.id, contactId: contact.id });
    });
    return {};
  });
}

export async function setPrimaryContactAction(dealId: string, contactId: string): Promise<Result> {
  return act('setPrimaryContact', async (user) => {
    const deal = await getAccessibleDeal(user, dealId);
    const contact = await db.contact.findFirst({ where: { id: contactId, companyId: deal.companyId } });
    if (!contact) return { error: 'Contact not found.' };
    await db.deal.update({ where: { id: deal.id }, data: { primaryContactId: contact.id } });
    return {};
  });
}

// ---------------------------------------------------------------------------
// LinkedIn activity in the CRM
// ---------------------------------------------------------------------------

/**
 * Logs a LinkedIn touch on the deal's timeline. LinkedIn messages are sent by hand, so this
 * is how the CRM keeps track of what was done and when.
 */
export async function logLinkedInTouch(dealId: string, contactId: string, touch: LinkedInTouch, note?: string): Promise<Result> {
  return act('logLinkedInTouch', async (user) => {
    if (!LINKEDIN_TOUCH_TITLES[touch]) return { error: 'Unknown LinkedIn activity.' };
    const deal = await getAccessibleDeal(user, dealId);
    const contact = await db.contact.findFirst({ where: { id: contactId, companyId: deal.companyId } });
    if (!contact) return { error: 'Contact not found.' };

    await db.$transaction(async (tx) => {
      await logActivity(tx, { dealId: deal.id, type: 'LINKEDIN', title: `${LINKEDIN_TOUCH_TITLES[touch]}: ${contact.name}`, details: note?.trim(), userId: user.id, contactId: contact.id });
      // A message or a reply means the conversation has started.
      if (touch === 'MESSAGE_SENT' || touch === 'REPLY_RECEIVED') await advanceDealStage(tx, deal, 'CONTACTED', { userId: user.id, reason: LINKEDIN_TOUCH_TITLES[touch] });
      // They answered: scheduled follow-ups must not keep going out.
      if (touch === 'REPLY_RECEIVED') await markDealReplied(tx, deal.id, `${contact.name} replied on LinkedIn`, user.id);
    });

    if (touch === 'CONNECTION_SENT') {
      const today = await countConnectionRequestsToday(user.id);
      if (today >= LINKEDIN_DAILY_CONNECTION_LIMIT) {
        return { message: `Logged. That is ${today} connection requests today: stop here to keep your LinkedIn account safe (limit ${LINKEDIN_DAILY_CONNECTION_LIMIT} a day).` };
      }
    }
    return {};
  });
}

/** Saves (or clears) a contact's LinkedIn profile URL. */
export async function setContactLinkedIn(dealId: string, contactId: string, profileUrl: string): Promise<Result> {
  return act('setContactLinkedIn', async (user) => {
    const url = profileUrl.trim().split('?')[0];
    if (url && !PROFILE_URL.test(url)) return { error: 'Enter a LinkedIn profile URL like https://www.linkedin.com/in/username' };
    const deal = await getAccessibleDeal(user, dealId);
    const contact = await db.contact.findFirst({ where: { id: contactId, companyId: deal.companyId } });
    if (!contact) return { error: 'Contact not found.' };
    await db.contact.update({ where: { id: contact.id }, data: { linkedinUrl: url || null } });
    return {};
  });
}

/**
 * Looks up a contact's LinkedIn profile at their company (needs the LinkedIn connection).
 * Returns candidates instead of guessing when several people match.
 */
export async function findContactOnLinkedIn(dealId: string, contactId: string): Promise<Result<{ found: boolean; candidates: { fullName: string; headline?: string; profileUrl: string }[] }>> {
  return act<{ found: boolean; candidates: { fullName: string; headline?: string; profileUrl: string }[] }>('findContactOnLinkedIn', async (user) => {
    const deal = await getAccessibleDeal(user, dealId);
    const contact = await db.contact.findFirst({ where: { id: contactId, companyId: deal.companyId } });
    if (!contact) return { error: 'Contact not found.' };

    const { findLinkedInCompany } = await import('@/features/linkedin/client');
    const { linkedinProvider } = await import('@/features/linkedin/provider');
    const firstName = contact.name.split(/\s+/)[0]?.replace(/[^\p{L}]/gu, '');
    if (!firstName) return { error: 'This contact has no name to search for.' };

    const company = await findLinkedInCompany({ domain: deal.company.domain || undefined, name: deal.company.name, linkedinUrl: deal.company.linkedinUrl || undefined });
    if (company.error) return { error: company.error.message };
    if (!company.company) return { error: company.note || `Could not find ${deal.company.name} on LinkedIn.` };

    const people = await linkedinProvider.getCompanyPeople({ companyUrl: company.company.linkedinUrl, query: firstName, maxItems: 8 });
    if (people.error) return { error: people.error.message };
    const matches = people.items.filter((p) => (p.firstName || p.fullName).toLowerCase().startsWith(firstName.toLowerCase()));
    if (!matches.length) return { error: `No one named ${firstName} was found at ${company.company.name} on LinkedIn.` };

    if (matches.length === 1) {
      await db.contact.update({ where: { id: contact.id }, data: { linkedinUrl: matches[0].profileUrl } });
      return { found: true };
    }
    return { found: false, candidates: matches.slice(0, 5).map((p) => ({ fullName: p.fullName, headline: p.headline, profileUrl: p.profileUrl })) };
  });
}

// ---------------------------------------------------------------------------
// Prospecting: Apollo and LinkedIn search results -> CRM
// ---------------------------------------------------------------------------

/** Which of these search results already have a deal (and who owns it). */
export async function lookupCrmStatusAction(input: CrmLookupInput): Promise<CrmLookupResult> {
  const user = await AuthService.verifySession();
  try {
    return await lookupCrmMatches(user, input);
  } catch (err) {
    logger.error('CRM lookup failed', err);
    return { people: {}, companies: {} };
  }
}

export type ApolloPersonInput = Pick<
  ApolloPersonMatch,
  'apolloPersonId' | 'personName' | 'linkedinUrl' | 'jobTitle' | 'organizationName' | 'organizationDomain' | 'organizationIndustry' | 'employeeCount' | 'technologies' | 'workEmail' | 'personalEmail' | 'phone'
>;

/**
 * Adds Apollo people to the signed-in user's pipeline (one or many). People whose company
 * already has an open deal are attached to that deal, whoever owns it.
 */
export async function addApolloPeopleToCrmAction(items: { key: string; person: ApolloPersonInput }[]): Promise<Result<{ created: number; existing: number; matches: Record<string, CrmMatch> }>> {
  return act<{ created: number; existing: number; matches: Record<string, CrmMatch> }>('addApolloPeopleToCrm', async (user) => {
    const valid = (items || []).filter((i) => i?.key && i.person?.personName?.trim()).slice(0, 50);
    if (!valid.length) return { error: 'Select at least one person to add.' };

    let created = 0;
    let existing = 0;
    for (const { person } of valid) {
      const name = cleanPersonName(person.personName);
      const apolloId = person.apolloPersonId && !person.apolloPersonId.startsWith('apollo-') ? person.apolloPersonId : null;
      try {
        const result = await createLead({
          company: {
            name: person.organizationName?.trim() || `${name} (independent)`,
            domain: person.organizationDomain,
            industry: person.organizationIndustry,
            employeeCount: person.employeeCount,
            technologies: person.technologies,
          },
          contact: { name, title: person.jobTitle, email: person.workEmail || person.personalEmail, phone: person.phone, linkedinUrl: person.linkedinUrl, apolloPersonId: apolloId },
          source: 'APOLLO',
          ownerId: user.id,
          actorId: user.id,
          note: { title: 'Added from Apollo search', details: [person.jobTitle, person.organizationName].filter(Boolean).join(' at ') },
        });
        if (result.created) created++; else existing++;
      } catch (err) {
        logger.error(`Could not add Apollo person ${person.apolloPersonId} to the CRM`, err);
      }
    }

    const lookup = await lookupCrmMatches(user, {
      people: valid.map(({ key, person }) => ({ key, apolloPersonId: person.apolloPersonId, linkedinUrl: person.linkedinUrl, email: person.workEmail || person.personalEmail })),
    });
    const parts = [created && `${created} new lead${created === 1 ? '' : 's'} added to your pipeline`, existing && `${existing} added to deals that already existed`].filter(Boolean);
    return { created, existing, matches: lookup.people, message: parts.length ? `${parts.join(', ')}.` : 'Nothing was added. Please try again.' };
  });
}

/** Adds an Apollo company to the pipeline as an account without a contact yet. */
export async function addApolloCompanyToCrmAction(org: Pick<ApolloOrganizationMatch, 'name' | 'domain' | 'linkedinUrl' | 'industry' | 'location' | 'employeeCount' | 'revenuePrinted' | 'technologies'>): Promise<Result<{ match: CrmMatch; created: boolean }>> {
  return act<{ match: CrmMatch; created: boolean }>('addApolloCompanyToCrm', async (user) => {
    if (!org?.name?.trim()) return { error: 'This company has no name.' };
    const result = await createLead({
      company: { name: org.name, domain: org.domain, linkedinUrl: org.linkedinUrl, industry: org.industry, location: org.location, employeeCount: org.employeeCount, revenue: org.revenuePrinted, technologies: org.technologies },
      source: 'APOLLO',
      ownerId: user.id,
      actorId: user.id,
      note: { title: 'Added from Apollo company search' },
    });
    const lookup = await lookupCrmMatches(user, { companies: [{ key: 'c', domain: org.domain, name: org.name }] });
    return {
      created: result.created,
      match: lookup.companies.c,
      message: result.created ? `${result.companyName} added to your pipeline. Add a contact to start outreach.` : existingDealMessage(result, false),
    };
  });
}

/**
 * Looks up a contact's email (and full name / LinkedIn profile) in Apollo. Uses 1 Apollo credit,
 * so the UI asks for confirmation first; nothing is guessed when Apollo has no match.
 */
export async function enrichContactWithApolloAction(dealId: string, contactId: string): Promise<Result> {
  return act('enrichContactWithApollo', async (user) => {
    if ((await SettingsService.get('apolloEnabled', 'true')) !== 'true') return { error: 'Apollo is turned off in Settings.' };
    const deal = await getAccessibleDeal(user, dealId);
    const contact = await db.contact.findFirst({ where: { id: contactId, companyId: deal.companyId } });
    if (!contact) return { error: 'Contact not found.' };
    if (!contact.apolloPersonId && !deal.company.domain) {
      return { error: 'Apollo needs the company website to find this person. Add the website to the company, or add the contact from Apollo search.' };
    }

    const [allowPersonalEmail, allowPhone] = await Promise.all([SettingsService.get('apolloAllowPersonalEmail', 'false'), SettingsService.get('apolloAllowPhone', 'false')]);
    const found = await apolloProvider.enrichPerson({
      apolloPersonId: contact.apolloPersonId || '',
      name: contact.name,
      domain: deal.company.domain || undefined,
      organizationName: deal.company.name,
      revealPersonalEmail: allowPersonalEmail === 'true',
      revealPhone: allowPhone === 'true',
    });
    if (!found) {
      const reason = getLastApolloErrors().find((e) => e.endpoint === 'people/match' && Date.now() - new Date(e.at).getTime() < 60000);
      return { error: reason?.message || 'Apollo has no match for this person.' };
    }

    const email = (found.workEmail || found.personalEmail || '').toLowerCase() || null;
    const profileUrl = found.linkedinUrl && /linkedin\.com\/in\//i.test(found.linkedinUrl) ? found.linkedinUrl.split('?')[0] : null;
    const gained = [!contact.email && email && 'email', !contact.phone && found.phone && 'phone', !contact.linkedinUrl && profileUrl && 'LinkedIn profile'].filter(Boolean);

    await db.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id: contact.id },
        data: {
          // Apollo returns the full name once the contact is revealed.
          name: isMaskedName(contact.name) && found.personName && !isMaskedName(found.personName) ? found.personName : contact.name,
          title: contact.title || found.jobTitle || null,
          email: contact.email || email,
          phone: contact.phone || found.phone || null,
          linkedinUrl: contact.linkedinUrl || profileUrl,
          apolloPersonId: contact.apolloPersonId || (found.apolloPersonId?.startsWith('apollo-') ? null : found.apolloPersonId) || null,
        },
      });
      await logActivity(tx, { dealId: deal.id, type: 'SYSTEM', title: `Apollo lookup for ${contact.name}: ${gained.length ? `found ${gained.join(', ')}` : 'nothing new'}`, details: '1 Apollo credit used.', userId: user.id, contactId: contact.id });
      await tx.activityLog.create({ data: { type: 'APOLLO_ENRICHED', title: `Apollo enrichment: ${found.personName || contact.name}`, details: `1 credit. ${gained.length ? `Found ${gained.join(', ')}.` : 'Nothing new found.'} Deal: ${deal.company.name}.`, entityId: deal.id, actor: user.name } });
    });

    if (!gained.length) return { message: 'Apollo matched this person but has no new contact details on file.' };
    return { message: `Apollo found ${gained.join(', ')} for ${contact.name}.` };
  });
}

// ---------------------------------------------------------------------------
// AI briefing
// ---------------------------------------------------------------------------

/**
 * Suggested next step, discovery questions and risks for one deal. It is generated on request
 * from what the CRM actually knows about the deal; without an AI key nothing is made up.
 */
export async function getDealAiBriefingAction(dealId: string): Promise<Result<{ briefing: CrmAiBriefing }>> {
  return act<{ briefing: CrmAiBriefing }>('getDealAiBriefing', async () => {
    const deal = await getDealDetail(dealId);
    if (!deal) return { error: 'Deal not found.' };

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) return { error: 'AI briefing needs GEMINI_API_KEY to be set in the environment.' };

    const facts = {
      company: deal.company,
      stage: deal.stage,
      dealValueUsd: deal.value,
      source: deal.source,
      nextAction: deal.nextAction,
      contacts: deal.contacts.map((c) => ({ name: c.name, title: c.title, hasEmail: !!c.email, hasLinkedIn: !!c.linkedinUrl })),
      recentTimeline: deal.activities.slice(0, 15).map((a) => ({ date: a.createdAt.slice(0, 10), type: a.type, title: a.title, details: a.details?.slice(0, 300) })),
      openTasks: deal.tasks.filter((t) => !t.completed).map((t) => t.title),
      meetings: deal.meetings.slice(0, 5).map((m) => ({ date: m.startTime.slice(0, 10), title: m.title, notes: m.notes?.slice(0, 300) })),
      proposals: deal.proposals.map((p) => ({ title: p.title, amount: p.amount, stage: p.stage })),
    };

    const prompt = `You are a sales coach for a software development agency. Brief the salesperson on this CRM deal.
Use ONLY the facts in the JSON below. Do not invent funding, competitors, hiring, revenue or buying signals that are not in the data.
If the data is thin, say so in the summary and focus on what to find out next.

DEAL DATA:
${JSON.stringify(facts)}

Output ONLY valid JSON matching this exact schema:
{
  "summary": "2-3 sentences on where this deal stands",
  "recommendedNextAction": "one specific next step",
  "discoveryQuestions": ["3-4 questions to ask the prospect"],
  "risks": ["1-3 risks or gaps visible in the data"],
  "suggestedServices": ["0-3 agency services that fit, only if the data supports them"]
}`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
      });
      if (!response.ok) throw new Error(`Gemini HTTP Error: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(String(text || '').trim()) as Partial<CrmAiBriefing>;
      const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
      return {
        briefing: {
          summary: String(parsed.summary || ''),
          recommendedNextAction: String(parsed.recommendedNextAction || ''),
          discoveryQuestions: list(parsed.discoveryQuestions),
          risks: list(parsed.risks),
          suggestedServices: list(parsed.suggestedServices),
        },
      };
    } catch (err) {
      logger.error(`AI briefing failed for deal ${dealId}`, err);
      return { error: 'The AI briefing could not be generated right now. Please try again.' };
    }
  });
}
