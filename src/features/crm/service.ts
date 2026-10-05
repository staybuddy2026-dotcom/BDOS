import { CrmActivityType, DealStage, LeadSource, PostStatus, Prisma, ProposalStage, TaskPriority, TaskStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import type { UserSession } from '@/lib/auth';
import { canSeeAllDeals } from '@/lib/roles';
import { getPostMetaMap } from '@/features/linkedin/store';
import { STAGE_PROBABILITY } from './types';
import type { CrmLookupInput, CrmLookupResult, CrmMatch } from './types';

/**
 * Database helpers behind the CRM server actions. Companies, contacts and deals are
 * real tables; nothing here invents values (deal size, employees, tech stack) that nobody entered.
 */

type Tx = Prisma.TransactionClient | typeof db;

const GENERIC_HOSTS = /(^|\.)(linkedin\.com|apollo\.io|twitter\.com|x\.com|facebook\.com|google\.com|upwork\.com|freelancer\.com|example\.com|enterprise\.com)$/i; // enterprise.com is the app's placeholder domain

/** "https://www.Acme.com/about" -> "acme.com". Returns null for values that are not a company website. */
export function normalizeCompanyDomain(value?: string | null): string | null {
  const domain = (value || '').trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/[/?#:].*$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) || GENERIC_HOSTS.test(domain)) return null;
  return domain;
}

const clean = (value?: string | null) => value?.trim() || null;

/** "linkedin.com/in/Jane-Roe/?x=1" -> "jane-roe". */
export const profileSlug = (url?: string | null) => url?.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1]?.toLowerCase() ?? null;

/** Apollo hides surnames until a contact is enriched ("Mike Br***m"); show those as "Mike B." */
export const cleanPersonName = (name: string) => name.replace(/(\p{L}+)\s+(\p{L})\p{L}*\*+\p{L}*/gu, '$1 $2.').trim();
export const isMaskedName = (name: string) => /\*/.test(name) || /\s\p{L}\.$/u.test(name.trim());
const isProfileUrl = (url?: string | null) => !!url && /linkedin\.com\/in\//i.test(url);
const isPostUrl = (url?: string | null) => !!url && /linkedin\.com\/(posts|feed)\//i.test(url);

/** "$25,000", "$10k - $20k" or "USD 1.5M" -> whole dollars of the first amount; null when there is none. */
export function parseUsdAmount(value?: string | number | null): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  const match = (value || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (!match) return null;
  const multiplier = match[2] ? (match[2].toLowerCase() === 'k' ? 1_000 : 1_000_000) : 1;
  const amount = Math.round(parseFloat(match[1]) * multiplier);
  return amount > 0 && amount < 1_000_000_000 ? amount : null;
}

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

/** Deals the user may see: everything for admins/managers, own + unassigned for a BDE. */
export function dealScope(user: UserSession): Prisma.DealWhereInput {
  return canSeeAllDeals(user.role) ? {} : { OR: [{ ownerId: user.id }, { ownerId: null }] };
}

export const canEditDeal = (user: UserSession, deal: { ownerId: string | null }) => canSeeAllDeals(user.role) || deal.ownerId === user.id;

/** Loads a deal the user may see. With `forEdit`, a BDE must own it (unassigned deals must be claimed first). */
export async function getAccessibleDeal(user: UserSession, dealId: string, forEdit = true) {
  const deal = await db.deal.findFirst({ where: { id: dealId, ...dealScope(user) }, include: { company: true } });
  if (!deal) throw new AppError('Deal not found.', 404, 'NOT_FOUND');
  if (forEdit && !canEditDeal(user, deal)) {
    throw new AppError('This lead is unassigned. Claim it first to work on it.', 403, 'FORBIDDEN');
  }
  return deal;
}

// ---------------------------------------------------------------------------
// Companies, contacts, deals
// ---------------------------------------------------------------------------

export type CompanyInput = {
  name: string;
  domain?: string | null;
  linkedinUrl?: string | null;
  industry?: string | null;
  location?: string | null;
  employeeCount?: number | null;
  revenue?: string | null;
  technologies?: string[];
  tags?: string[];
};

const mergeList = (a: string[], b?: string[]) => Array.from(new Set([...a, ...(b || []).map((x) => x.trim()).filter(Boolean)]));

/** Finds a company by website domain (or exact name when there is no domain) and fills in fields that were empty. */
export async function findOrCreateCompany(tx: Tx, input: CompanyInput) {
  const name = input.name.trim();
  const domain = normalizeCompanyDomain(input.domain);
  const existing =
    (domain && (await tx.company.findUnique({ where: { domain } }))) ||
    (await tx.company.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, ...(domain ? { domain: null } : {}) } }));

  const fields = {
    linkedinUrl: clean(input.linkedinUrl),
    industry: clean(input.industry),
    location: clean(input.location),
    employeeCount: input.employeeCount && input.employeeCount > 0 ? input.employeeCount : null,
    revenue: clean(input.revenue),
  };

  if (!existing) {
    return tx.company.create({ data: { name, domain, ...fields, technologies: mergeList([], input.technologies), tags: mergeList([], input.tags) } });
  }
  return tx.company.update({
    where: { id: existing.id },
    data: {
      domain: existing.domain || domain,
      linkedinUrl: existing.linkedinUrl || fields.linkedinUrl,
      industry: existing.industry || fields.industry,
      location: existing.location || fields.location,
      employeeCount: existing.employeeCount || fields.employeeCount,
      revenue: existing.revenue || fields.revenue,
      technologies: mergeList(existing.technologies, input.technologies),
      tags: mergeList(existing.tags, input.tags),
    },
  });
}

export type ContactInput = {
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  sourcePostUrl?: string | null;
  apolloPersonId?: string | null;
};

/** Finds the same person inside a company (by email, LinkedIn profile or name) and fills in missing details. */
export async function findOrCreateContact(tx: Tx, companyId: string, input: ContactInput) {
  const name = input.name.trim();
  const email = clean(input.email)?.toLowerCase() || null;
  const linkedinUrl = isProfileUrl(input.linkedinUrl) ? clean(input.linkedinUrl)!.split('?')[0] : null;
  const matchers: Prisma.ContactWhereInput[] = [{ name: { equals: name, mode: 'insensitive' } }];
  if (email) matchers.push({ email: { equals: email, mode: 'insensitive' } });
  if (linkedinUrl) matchers.push({ linkedinUrl });
  if (clean(input.apolloPersonId)) matchers.push({ apolloPersonId: input.apolloPersonId!.trim() });

  const existing = await tx.contact.findFirst({ where: { companyId, OR: matchers } });
  const fields = { title: clean(input.title), phone: clean(input.phone), sourcePostUrl: clean(input.sourcePostUrl), apolloPersonId: clean(input.apolloPersonId) };
  if (!existing) {
    return { contact: await tx.contact.create({ data: { companyId, name, email, linkedinUrl, ...fields } }), created: true };
  }
  const contact = await tx.contact.update({
    where: { id: existing.id },
    data: {
      title: existing.title || fields.title,
      email: existing.email || email,
      phone: existing.phone || fields.phone,
      linkedinUrl: existing.linkedinUrl || linkedinUrl,
      sourcePostUrl: existing.sourcePostUrl || fields.sourcePostUrl,
      apolloPersonId: existing.apolloPersonId || fields.apolloPersonId,
    },
  });
  return { contact, created: false };
}

export async function logActivity(tx: Tx, data: { dealId: string; type: CrmActivityType; title: string; details?: string | null; userId?: string | null; contactId?: string | null; createdAt?: Date }) {
  await tx.crmActivity.create({
    data: { dealId: data.dealId, type: data.type, title: data.title.slice(0, 200), details: data.details || null, userId: data.userId || null, contactId: data.contactId || null, createdAt: data.createdAt },
  });
  // Imported history keeps its original date and must not make an old deal look active.
  if (!data.createdAt) await tx.deal.update({ where: { id: data.dealId }, data: { lastActivityAt: new Date() } });
}

export type LeadInput = {
  company: CompanyInput;
  contact?: ContactInput | null;
  title?: string;
  value?: number | null;
  stage?: DealStage;
  source: LeadSource;
  sourceRef?: string | null;
  ownerId: string | null;
  /** First line on the deal's timeline, e.g. where the lead came from. */
  note?: { title: string; details?: string };
  actorId?: string | null;
};

export type LeadResult = {
  dealId: string;
  companyName: string;
  created: boolean;
  ownerName: string | null;
  /** The company's open deal had no owner, so it was given to the person adding the lead. */
  claimed: boolean;
};

/**
 * Adds a lead to the CRM: company + contact + deal in one step.
 * If the company already has an open deal, the contact is attached to that deal instead of
 * opening a duplicate, which also stops two BDEs working the same account unknowingly.
 */
export async function createLead(input: LeadInput): Promise<LeadResult> {
  return db.$transaction(async (tx) => {
    const company = await findOrCreateCompany(tx, input.company);
    const found = input.contact?.name?.trim() ? await findOrCreateContact(tx, company.id, input.contact) : null;
    const contact = found?.contact ?? null;

    const openDeal = await tx.deal.findFirst({
      where: { companyId: company.id, stage: { notIn: ['WON', 'LOST'] } },
      include: { owner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (openDeal) {
      if (contact && !openDeal.primaryContactId) await tx.deal.update({ where: { id: openDeal.id }, data: { primaryContactId: contact.id } });
      if (contact && found?.created) {
        await logActivity(tx, { dealId: openDeal.id, type: 'SYSTEM', title: `Contact added: ${contact.name}`, details: contact.title, userId: input.actorId, contactId: contact.id });
      }
      // Nobody owns the deal yet: whoever brings the lead in takes it.
      if (!openDeal.ownerId && input.ownerId) {
        const owner = await tx.deal.update({ where: { id: openDeal.id }, data: { ownerId: input.ownerId }, select: { owner: { select: { name: true } } } });
        await logActivity(tx, { dealId: openDeal.id, type: 'SYSTEM', title: `Claimed by ${owner.owner?.name || 'a team member'}`, userId: input.actorId });
        return { dealId: openDeal.id, companyName: company.name, created: false, ownerName: owner.owner?.name ?? null, claimed: true };
      }
      return { dealId: openDeal.id, companyName: company.name, created: false, ownerName: openDeal.owner?.name ?? null, claimed: false };
    }

    const stage = input.stage || 'LEAD';
    const deal = await tx.deal.create({
      data: {
        title: input.title?.trim() || company.name,
        companyId: company.id,
        primaryContactId: contact?.id,
        ownerId: input.ownerId,
        stage,
        value: input.value && input.value > 0 ? Math.round(input.value) : null,
        probability: STAGE_PROBABILITY[stage],
        source: input.source,
        sourceRef: input.sourceRef || null,
        closedAt: stage === 'WON' || stage === 'LOST' ? new Date() : null,
        // A deal entered straight as Won/Lost has no known path; it counts only as the outcome.
        furthestStage: isOpenStage(stage) ? stage : 'LEAD',
      },
      include: { owner: { select: { name: true } } },
    });
    await logActivity(tx, { dealId: deal.id, type: 'SYSTEM', title: input.note?.title || 'Lead added to the CRM', details: input.note?.details, userId: input.actorId });
    return { dealId: deal.id, companyName: company.name, created: true, ownerName: deal.owner?.name ?? null, claimed: false };
  });
}

// ---------------------------------------------------------------------------
// "Already in the CRM?" lookup for search results
// ---------------------------------------------------------------------------

/**
 * Finds which of the given people and companies already have a deal. Every team member gets an
 * answer (that is the point: avoid double work), but the deal link is only included when they may open it.
 */
export async function lookupCrmMatches(user: UserSession, input: CrmLookupInput): Promise<CrmLookupResult> {
  const result: CrmLookupResult = { people: {}, companies: {} };
  const dealInclude = { deals: { orderBy: { createdAt: 'desc' as const }, include: { owner: { select: { name: true } } } } };

  type CompanyWithDeals = Prisma.CompanyGetPayload<{ include: typeof dealInclude }>;
  const toMatch = (company: CompanyWithDeals): CrmMatch | null => {
    const deal = company.deals.find((d) => d.stage !== 'WON' && d.stage !== 'LOST') || company.deals[0];
    if (!deal) return null;
    const visible = canSeeAllDeals(user.role) || deal.ownerId === user.id || deal.ownerId === null;
    return { dealId: visible ? deal.id : null, companyName: company.name, stage: deal.stage, ownerName: deal.owner?.name ?? null, mine: deal.ownerId === user.id };
  };

  const people = (input.people || []).slice(0, 200);
  if (people.length) {
    const apolloIds = people.map((p) => p.apolloPersonId?.trim()).filter((id): id is string => !!id && !id.startsWith('apollo-'));
    const emails = people.map((p) => p.email?.trim().toLowerCase()).filter((e): e is string => !!e);
    const slugs = Array.from(new Set(people.map((p) => profileSlug(p.linkedinUrl)).filter((s): s is string => !!s)));
    const or: Prisma.ContactWhereInput[] = [];
    if (apolloIds.length) or.push({ apolloPersonId: { in: apolloIds } });
    if (emails.length) or.push({ email: { in: emails, mode: 'insensitive' } });
    for (const slug of slugs) or.push({ linkedinUrl: { endsWith: `/in/${slug}`, mode: 'insensitive' } }, { linkedinUrl: { endsWith: `/in/${slug}/`, mode: 'insensitive' } });

    if (or.length) {
      const contacts = await db.contact.findMany({ where: { OR: or }, include: { company: { include: dealInclude } } });
      for (const p of people) {
        const slug = profileSlug(p.linkedinUrl);
        const email = p.email?.trim().toLowerCase();
        const contact = contacts.find((c) =>
          (!!p.apolloPersonId && c.apolloPersonId === p.apolloPersonId.trim()) ||
          (!!slug && profileSlug(c.linkedinUrl) === slug) ||
          (!!email && c.email?.toLowerCase() === email));
        const match = contact && toMatch(contact.company);
        if (match) result.people[p.key] = match;
      }
    }
  }

  const companies = (input.companies || []).slice(0, 200);
  if (companies.length) {
    const domains = companies.map((c) => normalizeCompanyDomain(c.domain)).filter((d): d is string => !!d);
    const names = Array.from(new Set(companies.map((c) => c.name?.trim()).filter((n): n is string => !!n)));
    const or: Prisma.CompanyWhereInput[] = names.map((name) => ({ name: { equals: name, mode: 'insensitive' as const } }));
    if (domains.length) or.push({ domain: { in: domains } });

    if (or.length) {
      const rows = await db.company.findMany({ where: { OR: or, deals: { some: {} } }, include: dealInclude });
      for (const c of companies) {
        const domain = normalizeCompanyDomain(c.domain);
        const name = c.name?.trim().toLowerCase();
        // A website match is exact; fall back to the name only when the CRM company has no different website.
        const row = (domain && rows.find((r) => r.domain === domain)) || (name && rows.find((r) => r.name.toLowerCase() === name && (!domain || !r.domain)));
        const match = row && toMatch(row);
        if (match) result.companies[c.key] = match;
      }
    }
  }
  return result;
}

const STAGE_ORDER: DealStage[] = ['LEAD', 'CONTACTED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'];
const OPEN_STAGES: DealStage[] = STAGE_ORDER.slice(0, 5);
const isOpenStage = (stage: DealStage) => OPEN_STAGES.includes(stage);

const STAGE_BY_LABEL: Record<string, DealStage> = {
  lead: 'LEAD', contacted: 'CONTACTED', 'meeting scheduled': 'MEETING_SCHEDULED', 'proposal sent': 'PROPOSAL_SENT', negotiation: 'NEGOTIATION', won: 'WON', lost: 'LOST',
};

/**
 * The furthest open stage reached, from a deal's stage-change titles ("Stage: Lead → Contacted", or the
 * old store's "Stage Updated: Lead ➔ Contacted") and its current stage. Won and Lost are outcomes, not
 * stages reached: a deal moved straight from Contacted to Won reached Contacted.
 */
export function furthestStageFrom(titles: string[], current: DealStage): DealStage {
  let best = isOpenStage(current) ? STAGE_ORDER.indexOf(current) : 0;
  for (const title of titles) {
    for (const part of title.split(/→|➔/).map((x) => x.replace(/^.*:/, '').trim().toLowerCase())) {
      const stage = STAGE_BY_LABEL[part];
      if (stage && isOpenStage(stage)) best = Math.max(best, STAGE_ORDER.indexOf(stage));
    }
  }
  return STAGE_ORDER[best];
}

const FURTHEST_BACKFILLED_KEY = 'crm_furthest_stage_backfilled_at';

/** One-time fill of `furthestStage` for deals created before the column existed, from their timeline. */
export async function backfillFurthestStage(): Promise<number> {
  if (await db.applicationSettings.findUnique({ where: { key: FURTHEST_BACKFILLED_KEY } })) return 0;
  const deals = await db.deal.findMany({ select: { id: true, stage: true, furthestStage: true, activities: { where: { type: 'STAGE_CHANGE' }, select: { title: true } } } });
  let updated = 0;
  for (const deal of deals) {
    const furthest = furthestStageFrom(deal.activities.map((a) => a.title), deal.stage);
    if (furthest !== deal.furthestStage) { await db.deal.update({ where: { id: deal.id }, data: { furthestStage: furthest } }); updated++; }
  }
  const value = new Date().toISOString();
  await db.applicationSettings.upsert({ where: { key: FURTHEST_BACKFILLED_KEY }, update: { value }, create: { key: FURTHEST_BACKFILLED_KEY, value } });
  return updated;
}

/** Moves a deal to a stage, resets its win probability and records the change on the timeline. */
export async function changeDealStage(tx: Tx, deal: { id: string; stage: DealStage }, stage: DealStage, options: { userId?: string | null; lostReason?: string | null; reason?: string } = {}) {
  if (deal.stage === stage) return;
  const closed = stage === 'WON' || stage === 'LOST';
  await tx.deal.update({
    where: { id: deal.id },
    data: {
      stage,
      probability: STAGE_PROBABILITY[stage],
      stageChangedAt: new Date(),
      closedAt: closed ? new Date() : null,
      lostReason: stage === 'LOST' ? options.lostReason || null : null,
    },
  });
  if (isOpenStage(stage)) {
    // Only ever moves forward: going back to an earlier stage does not undo what was reached.
    await tx.deal.updateMany({ where: { id: deal.id, furthestStage: { in: OPEN_STAGES.slice(0, OPEN_STAGES.indexOf(stage)) } }, data: { furthestStage: stage } });
  }
  const label = (s: DealStage) => s.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  await logActivity(tx, {
    dealId: deal.id,
    type: 'STAGE_CHANGE',
    title: `Stage: ${label(deal.stage)} → ${label(stage)}`,
    details: stage === 'LOST' && options.lostReason ? `Reason: ${options.lostReason}` : options.reason,
    userId: options.userId,
  });
  // Once a meeting is booked (or the deal is closed) cold follow-ups would only do harm.
  if (STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf('MEETING_SCHEDULED')) {
    await stopSequencesForDeal(tx, deal.id, `Deal moved to ${label(stage)}`, options.userId);
  }
}

/** The prospect answered: stop chasing them and mark their sequences as replied. */
export async function markDealReplied(tx: Tx, dealId: string, reason: string, userId?: string | null) {
  await stopSequencesForDeal(tx, dealId, reason, userId);
  await tx.outreachDraft.updateMany({ where: { dealId, status: { in: ['APPROVED', 'SENT', 'FOLLOW_UP_DUE'] } }, data: { status: 'REPLIED' } });
}

/**
 * Cancels the scheduled (not yet sent) follow-ups of every outreach sequence linked to a deal,
 * and records why. Returns how many messages were cancelled.
 */
export async function stopSequencesForDeal(tx: Tx, dealId: string, reason: string, userId?: string | null): Promise<number> {
  const drafts = await tx.outreachDraft.findMany({ where: { dealId, followUps: { some: { status: 'PENDING' } } }, select: { id: true, status: true } });
  if (!drafts.length) return 0;

  const ids = drafts.map((d) => d.id);
  const cancelled = await tx.followUp.updateMany({ where: { draftId: { in: ids }, status: 'PENDING' }, data: { status: 'CANCELLED' } });
  await tx.outreachDraft.updateMany({ where: { id: { in: ids } }, data: { stoppedReason: reason } });
  for (const draft of drafts) {
    await tx.outreachHistory.create({ data: { draftId: draft.id, status: draft.status, notes: `Sequence stopped: ${reason}.` } });
  }
  await logActivity(tx, { dealId, type: 'SYSTEM', title: 'Follow-up sequence stopped', details: `${reason}. ${cancelled.count} scheduled message${cancelled.count === 1 ? '' : 's'} cancelled.`, userId });
  return cancelled.count;
}

/** Moves an open deal forward to `stage` when it is still at an earlier stage (never backwards, never reopens). */
export async function advanceDealStage(tx: Tx, deal: { id: string; stage: DealStage }, stage: DealStage, options: { userId?: string | null; reason?: string } = {}) {
  if (deal.stage === 'WON' || deal.stage === 'LOST') return;
  if (STAGE_ORDER.indexOf(deal.stage) < STAGE_ORDER.indexOf(stage)) await changeDealStage(tx, deal, stage, options);
}

// ---------------------------------------------------------------------------
// Review Queue -> CRM sync
// ---------------------------------------------------------------------------

const IGNORED_POSTS_KEY = 'crm_ignored_post_ids';

async function readIgnoredPostIds(): Promise<string[]> {
  const row = await db.applicationSettings.findUnique({ where: { key: IGNORED_POSTS_KEY } }).catch(() => null);
  try { return row?.value ? (JSON.parse(row.value) as string[]) : []; } catch { return []; }
}

/** Remembers a deleted post-based deal so the sync below does not bring it back. */
export async function ignorePostForCrmSync(postId: string) {
  const ids = Array.from(new Set([...(await readIgnoredPostIds()), postId])).slice(-2000);
  const value = JSON.stringify(ids);
  await db.applicationSettings.upsert({ where: { key: IGNORED_POSTS_KEY }, update: { value }, create: { key: IGNORED_POSTS_KEY, value } });
}

/**
 * Leads that reached the Review Queue (or already have outreach drafted) appear in the CRM
 * as unassigned deals, so the team can claim them. Only facts from the post and its Apollo
 * enrichment are copied; deal value and company details stay empty until someone fills them in.
 */
export async function syncReviewPostsToCrm(): Promise<number> {
  const posts = await db.linkedInPost.findMany({
    where: {
      status: { not: PostStatus.DISMISSED },
      OR: [{ status: PostStatus.APPROVED }, { status: PostStatus.REVIEW_QUEUE }, { drafts: { some: {} } }],
    },
    include: { apolloEnrichment: true },
    orderBy: { discoveredAt: 'desc' },
    take: 500,
  });
  if (!posts.length) return 0;

  const [existing, ignored] = await Promise.all([
    db.deal.findMany({ where: { source: 'LINKEDIN_POST', sourceRef: { in: posts.map((p) => p.id) } }, select: { sourceRef: true } }),
    readIgnoredPostIds(),
  ]);
  const skip = new Set([...existing.map((d) => d.sourceRef), ...ignored]);
  const fresh = posts.filter((p) => !skip.has(p.id));
  if (!fresh.length) return 0;

  const postMeta = await getPostMetaMap();
  let created = 0;
  for (const post of fresh) {
    try {
      const enrichment = post.apolloEnrichment?.enrichmentStatus === 'ENRICHED' ? post.apolloEnrichment : null;
      // Outreach targets are stored as linkedin.com/company/<domain>, which carries the real website.
      const urlDomain = post.postUrl.match(/linkedin\.com\/company\/([a-z0-9-]+\.[a-z.]{2,})\/?$/i)?.[1];
      const personName = enrichment?.personName || post.authorName;
      // Placeholders such as "Decision Maker" or "<Company> Executive" are not people.
      const hasPerson = !!personName && !/^(decision maker|executive|key contact)|executive$/i.test(personName);
      const companyName = clean(enrichment?.organizationName) || clean(post.companyName) || (hasPerson ? `${personName} (independent)` : 'Unknown company');
      const profileUrl = isProfileUrl(enrichment?.linkedinUrl) ? enrichment!.linkedinUrl : postMeta[post.postUrl]?.authorProfileUrl;

      const result = await createLead({
        company: { name: companyName, domain: enrichment?.organizationDomain || urlDomain },
        contact: hasPerson
          ? {
              name: personName,
              title: enrichment?.jobTitle || post.authorHeadline,
              email: enrichment?.workEmail || enrichment?.personalEmail,
              phone: enrichment?.phone,
              linkedinUrl: profileUrl,
              sourcePostUrl: isPostUrl(post.postUrl) ? post.postUrl : null,
              apolloPersonId: enrichment?.apolloPersonId,
            }
          : null,
        source: 'LINKEDIN_POST',
        sourceRef: post.id,
        ownerId: null,
        note: {
          title: 'Synced from the Review Queue',
          details: [`Matched keyword: ${post.matchedKeyword}`, post.opportunityScore != null ? `Opportunity score: ${post.opportunityScore}/100` : null].filter(Boolean).join('. '),
        },
      });
      if (result.created) created++;
      // The company already had an open deal: record the post there so it is not re-checked every load.
      else await ignorePostForCrmSync(post.id);
    } catch (err) {
      // A parallel request may have synced the same post (unique source + sourceRef).
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) logger.error(`Could not sync post ${post.id} to the CRM`, err);
    }
  }
  return created;
}

// ---------------------------------------------------------------------------
// One-time migration from the old JSON store
// ---------------------------------------------------------------------------

const LEGACY_STORE_KEY = 'crm_accounts_store';
const LEGACY_MIGRATED_KEY = 'crm_store_migrated_at';

type LegacyAccount = {
  id: string; name: string; domain?: string; industry?: string; location?: string; revenue?: string; employeeCount?: number;
  stage?: string; dealValueNumber?: number; technologies?: string[]; tags?: string[]; createdDate?: string;
  decisionMakers?: { name: string; title?: string; email?: string; phone?: string; linkedinUrl?: string; sourcePostUrl?: string }[];
  meetings?: { id: string; date: string; title: string; attendees?: string[]; outcome?: string; googleMeetUrl?: string; zoomUrl?: string }[];
  proposals?: { id: string; version: string; value: string; date: string; status: string; expiryDate?: string }[];
  tasks?: { id: string; title: string; priority?: string; dueDate?: string; completed?: boolean; assignedUser?: string }[];
  timeline?: { id: string; type: string; title: string; details?: string }[];
};

const LEGACY_STAGES: Record<string, DealStage> = {
  Lead: 'LEAD', Contacted: 'CONTACTED', 'Meeting Scheduled': 'MEETING_SCHEDULED', 'Proposal Sent': 'PROPOSAL_SENT',
  Negotiation: 'NEGOTIATION', Won: 'WON', Lost: 'LOST', 'Repeat Client': 'WON',
};
const LEGACY_ACTIVITY_TYPES: Record<string, CrmActivityType> = {
  LinkedIn: 'LINKEDIN', Proposal: 'PROPOSAL', Meeting: 'MEETING', Call: 'CALL', Email: 'EMAIL', Task: 'TASK', 'Status Change': 'STAGE_CHANGE', Note: 'NOTE',
};
const LEGACY_PROPOSAL_STAGES: Record<string, ProposalStage> = { Draft: 'DRAFT', Sent: 'SENT', Viewed: 'VIEWED', Downloaded: 'VIEWED', Accepted: 'WON', Rejected: 'LOST' };

const validDate = (value?: string | null, fallback = new Date()) => {
  const d = value ? new Date(value) : fallback;
  return Number.isNaN(d.getTime()) ? fallback : d;
};
// Old ids look like "act_1723456789012": the number is when the entry was created.
const dateFromLegacyId = (id: string, fallback: Date) => {
  const ms = Number(id.match(/_(\d{13})(?:_|$)/)?.[1]);
  return ms > 1_500_000_000_000 && ms <= Date.now() ? new Date(ms) : fallback;
};

/**
 * Moves accounts from the old single-JSON CRM store into the Company / Contact / Deal tables.
 * Runs once; the JSON value is left in place as a backup. Values the old store made up for
 * auto-synced leads (deal size, 150 employees, a default tech stack, a guessed domain) are not carried over.
 */
export async function migrateLegacyCrmStore(): Promise<number> {
  if (await db.applicationSettings.findUnique({ where: { key: LEGACY_MIGRATED_KEY } })) return 0;

  const row = await db.applicationSettings.findUnique({ where: { key: LEGACY_STORE_KEY } });
  let accounts: LegacyAccount[] = [];
  try { accounts = row?.value ? (JSON.parse(row.value) as LegacyAccount[]) : []; } catch { logger.error('Old CRM store is not valid JSON; nothing was migrated.'); }

  // The old single-user data belongs to the workspace's first admin.
  const owner = await db.user.findFirst({ where: { role: 'ADMIN', isActive: true }, orderBy: { createdAt: 'asc' } });
  let migrated = 0;
  let failed = 0;

  for (const acc of accounts) {
    if (!acc?.id || !acc.name) continue;
    if (await db.deal.findUnique({ where: { legacyId: acc.id } })) continue;
    try {
      const tags = acc.tags || [];
      const autoSynced = tags.includes('Pipeline-Auto-Sync');
      const source: LeadSource = autoSynced ? 'LINKEDIN_POST' : tags.includes('Apollo-Sync') ? 'APOLLO' : tags.includes('Marketplace-RFP') ? 'MARKETPLACE' : acc.id.startsWith('crm_li_') ? 'LINKEDIN_PEOPLE' : 'MANUAL';
      const trusted = !autoSynced; // auto-synced accounts were filled with placeholder values
      const createdAt = validDate(acc.createdDate);
      const stage = LEGACY_STAGES[acc.stage || 'Lead'] || 'LEAD';
      const closed = stage === 'WON' || stage === 'LOST';

      await db.$transaction(async (tx) => {
        const company = await findOrCreateCompany(tx, {
          name: acc.name,
          domain: trusted && source !== 'MARKETPLACE' ? acc.domain : null,
          industry: trusted ? acc.industry : null,
          location: trusted ? acc.location : null,
          employeeCount: trusted ? acc.employeeCount : null,
          revenue: trusted && acc.revenue !== 'Active Prospect' && acc.revenue !== 'Inbound Project' ? acc.revenue : null,
          technologies: trusted ? acc.technologies : [],
          tags: [...tags.filter((t) => !['Pipeline-Auto-Sync', 'New-Account', 'Target-Prospect'].includes(t)), ...(acc.stage === 'Repeat Client' ? ['Repeat Client'] : [])],
        });

        const contacts = [];
        for (const dm of acc.decisionMakers || []) {
          if (!dm?.name?.trim()) continue;
          contacts.push((await findOrCreateContact(tx, company.id, dm)).contact);
        }

        const deal = await tx.deal.create({
          data: {
            title: acc.name,
            companyId: company.id,
            primaryContactId: contacts[0]?.id,
            ownerId: owner?.id ?? null,
            stage,
            value: trusted && acc.dealValueNumber && acc.dealValueNumber > 0 ? Math.round(acc.dealValueNumber) : null,
            probability: STAGE_PROBABILITY[stage],
            source,
            // Auto-synced accounts used the post id as their id; keeping it stops the sync re-adding them.
            sourceRef: autoSynced ? acc.id : null,
            legacyId: acc.id,
            furthestStage: furthestStageFrom((acc.timeline || []).filter((t) => t.type === 'Status Change').map((t) => t.title), stage),
            createdAt,
            stageChangedAt: createdAt,
            lastActivityAt: createdAt,
            closedAt: closed ? createdAt : null,
          },
        });

        for (const item of acc.timeline || []) {
          await logActivity(tx, { dealId: deal.id, type: LEGACY_ACTIVITY_TYPES[item.type] || 'SYSTEM', title: item.title, details: item.details, createdAt: dateFromLegacyId(item.id, createdAt) });
        }
        for (const t of acc.tasks || []) {
          // Placeholder task the old auto-sync attached to every post.
          if (autoSynced && t.id.startsWith('task_db_')) continue;
          await tx.task.create({
            data: {
              title: t.title,
              priority: t.priority === 'HIGH' ? TaskPriority.HIGH : t.priority === 'LOW' ? TaskPriority.LOW : TaskPriority.NORMAL,
              dueDate: validDate(t.dueDate),
              status: t.completed ? TaskStatus.COMPLETED : TaskStatus.PENDING,
              completedAt: t.completed ? new Date() : null,
              linkedOpportunity: acc.name,
              assignedOwner: owner?.name || t.assignedUser || 'BDE Team',
              assigneeId: owner?.id,
              dealId: deal.id,
              createdAt: dateFromLegacyId(t.id, createdAt),
            },
          });
        }
        for (const m of acc.meetings || []) {
          await tx.meeting.create({
            data: {
              title: m.title,
              startTime: validDate(m.date),
              clientName: contacts[0]?.name || acc.name,
              clientEmail: contacts[0]?.email,
              companyName: acc.name,
              meetingUrl: m.googleMeetUrl || m.zoomUrl || null,
              status: 'COMPLETED',
              notes: m.outcome,
              attendees: m.attendees || [],
              dealId: deal.id,
            },
          });
        }
        for (const p of acc.proposals || []) {
          await tx.proposal.create({
            data: {
              title: `Proposal ${p.version}`,
              clientName: contacts[0]?.name || acc.name,
              companyName: acc.name,
              budget: p.value,
              stage: LEGACY_PROPOSAL_STAGES[p.status] || 'SENT',
              validUntil: p.expiryDate ? validDate(p.expiryDate) : null,
              version: p.version,
              amount: parseUsdAmount(p.value),
              dealId: deal.id,
              createdAt: validDate(p.date),
            },
          });
        }
      });
      migrated++;
    } catch (err) {
      failed++;
      logger.error(`Could not migrate old CRM account ${acc.id}`, err);
    }
  }

  // Leave the migration open while any account failed, so the next load retries it (already-moved accounts are skipped).
  if (failed) return migrated;

  const value = new Date().toISOString();
  await db.applicationSettings.upsert({ where: { key: LEGACY_MIGRATED_KEY }, update: { value }, create: { key: LEGACY_MIGRATED_KEY, value } });
  if (accounts.length) logger.info(`Migrated ${migrated} of ${accounts.length} accounts from the old CRM store.`);
  return migrated;
}
