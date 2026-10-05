'use server';

import { KeywordStatus, PostStatus } from '@prisma/client';
import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { isLinkedInEnabledSetting } from './settings';
import { safeRevalidatePath } from '@/lib/revalidate';
import { findLinkedInCompany, getLinkedInCompanyData, getLinkedInRateLimit } from './client';
import { analyzeLinkedInOrganicIntelligence } from './intelligence';
import { getLastLinkedInError, isLinkedInConfigured, linkedinProvider, LINKEDIN_SETUP_HINT, PostedLimit } from './provider';
import { getPostMetaMap, savePostMeta } from './store';
import { draftComment, hasAiKey, intentLevelFromScore, scorePosts } from './intent';
import type { IntentSource, PostIntent } from './intent';
import { createLead, ignorePostForCrmSync, lookupCrmMatches } from '@/features/crm/service';
import type { CrmMatch } from '@/features/crm/types';
import type {
  LinkedInAnalyticsTelemetry,
  LinkedInCompanyResult,
  LinkedInErrorInfo,
  LinkedInIntelligenceData,
  LinkedInPostResult,
  LinkedInProfileResult,
  LinkedInStatus,
} from './types';

const isEnabled = () => isLinkedInEnabledSetting();

const disabledError = (operation: string): LinkedInErrorInfo => ({
  code: 'NOT_CONFIGURED',
  operation,
  at: new Date().toISOString(),
  message: 'LinkedIn is turned off in Settings. Enable it under Settings > LinkedIn.',
});

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/** Connection status shown across the app (workspace banner, Settings, provider cards). */
export async function getLinkedInStatusAction(): Promise<LinkedInStatus> {
  await AuthService.verifySession();
  const [configured, enabled] = await Promise.all([isLinkedInConfigured(), isEnabled()]);
  if (!configured) {
    return { configured, enabled, healthy: false, message: `LinkedIn is not connected yet. ${LINKEDIN_SETUP_HINT}` };
  }
  if (!enabled) return { configured, enabled, healthy: false, message: 'LinkedIn is turned off in Settings.' };
  const account = await linkedinProvider.checkAccount();
  return {
    configured,
    enabled,
    healthy: account.ok,
    message: account.message,
    account: account.account,
    monthlyUsageUsd: account.monthlyUsageUsd,
    monthlyLimitUsd: account.monthlyLimitUsd,
    lastError: account.error || getLastLinkedInError(),
  };
}

// ---------------------------------------------------------------------------
// Posts: search, save, keyword scan, inbox
// ---------------------------------------------------------------------------

export type LinkedInPostSearchItem = LinkedInPostResult & { alreadySaved: boolean };

export async function searchLinkedInPostsAction(params: {
  query: string;
  postedLimit?: PostedLimit;
  maxPosts?: number;
  authorKeywords?: string;
}): Promise<{ items: LinkedInPostSearchItem[]; error?: LinkedInErrorInfo; cached?: boolean }> {
  await AuthService.verifySession();
  if (!(await isEnabled())) return { items: [], error: disabledError('postSearch') };
  if (!params.query?.trim()) return { items: [] };

  const res = await linkedinProvider.searchPosts(params);
  const urls = res.items.map((p) => p.url);
  const existing = urls.length
    ? await db.linkedInPost.findMany({ where: { postUrl: { in: urls } }, select: { postUrl: true } }).catch(() => [])
    : [];
  const saved = new Set(existing.map((e) => e.postUrl));
  return { items: res.items.map((p) => ({ ...p, alreadySaved: saved.has(p.url) })), error: res.error, cached: res.cached };
}

/** Intent scores sent back by the browser are only trusted as far as "a number between 0 and 100". */
function cleanIntent(intent?: PostIntent): PostIntent | undefined {
  const score = Math.round(Number(intent?.score));
  if (!intent || !Number.isFinite(score)) return undefined;
  const bounded = Math.max(0, Math.min(100, score));
  return { score: bounded, level: intentLevelFromScore(bounded), reason: String(intent.reason || '').slice(0, 200) };
}

async function persistPosts(
  posts: LinkedInPostResult[],
  options: { matchedKeyword: string; keywordCategory?: string; status: PostStatus; intents?: Record<string, PostIntent> }
): Promise<{ created: number; skipped: number; ids: string[] }> {
  let created = 0;
  let skipped = 0;
  const ids: string[] = [];
  const meta: Parameters<typeof savePostMeta>[0] = {};

  for (const post of posts) {
    try {
      const existing = await db.linkedInPost.findUnique({ where: { postUrl: post.url }, select: { id: true, status: true } });
      if (existing) {
        // Promote an already-discovered post when the BDE explicitly sends it to review.
        if (options.status === PostStatus.REVIEW_QUEUE && existing.status === PostStatus.DISCOVERED) {
          await db.linkedInPost.update({ where: { id: existing.id }, data: { status: PostStatus.REVIEW_QUEUE } });
          ids.push(existing.id);
        }
        skipped++;
        continue;
      }
      const intent = cleanIntent(options.intents?.[post.id]);
      const row = await db.linkedInPost.create({
        data: {
          postUrl: post.url,
          authorName: post.authorName,
          authorHeadline: post.authorHeadline,
          companyName: post.authorCompany,
          postPreview: post.content.slice(0, 600),
          postContent: post.content,
          postedAt: post.postedAt ? new Date(post.postedAt) : null,
          matchedKeyword: options.matchedKeyword.slice(0, 120),
          keywordCategory: options.keywordCategory,
          engagementCount: post.likes + post.comments + post.shares,
          opportunityScore: intent?.score,
          status: options.status,
        },
      });
      ids.push(row.id);
      meta[post.url] = {
        authorProfileUrl: post.authorProfileUrl, authorType: post.authorType, likes: post.likes, comments: post.comments, shares: post.shares,
        intentScore: intent?.score, intentReason: intent?.reason,
      };
      created++;
    } catch (err) {
      logger.error(`Could not save LinkedIn post ${post.url}`, err);
    }
  }
  await savePostMeta(meta);
  return { created, skipped, ids };
}

/** Saves selected search results as leads: into the Review Queue (default) or just as discovered posts. */
export async function saveLinkedInPostsAction(
  posts: LinkedInPostResult[],
  options: { matchedKeyword: string; toReviewQueue?: boolean; intents?: Record<string, PostIntent> }
): Promise<{ created: number; skipped: number; ids: string[] }> {
  await AuthService.verifySession();
  const valid = (posts || []).filter((p) => p && /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(p.url) && p.content && p.authorName).slice(0, 50);
  if (!valid.length) throw new AppError('No valid LinkedIn posts to save.', 400);

  const result = await persistPosts(valid, {
    matchedKeyword: options.matchedKeyword || 'LinkedIn search',
    status: options.toReviewQueue === false ? PostStatus.DISCOVERED : PostStatus.REVIEW_QUEUE,
    intents: options.intents,
  });
  safeRevalidatePath('/review');
  safeRevalidatePath('/discovery');
  safeRevalidatePath('/crm');
  return result;
}

const TIMEFRAME_TO_LIMIT: Record<string, PostedLimit> = { '1h': '1h', '24h': '24h', '7d': 'week', week: 'week', '30d': 'month', month: 'month' };

export type KeywordScanResult = {
  keyword: string;
  found: number;
  created: number;
  skipped: number;
  error?: string;
};

/**
 * Scans active keywords from the keyword library on LinkedIn and stores new posts as discovered leads.
 * Least-recently-scanned keywords go first, and the number per run is capped to keep scraper cost predictable.
 */
export async function scanLinkedInKeywordsAction(options: {
  timeframe?: string;
  maxKeywords?: number;
  maxPostsPerKeyword?: number;
} = {}): Promise<{ results: KeywordScanResult[]; created: number; scanned: number; totalActive: number; error?: LinkedInErrorInfo }> {
  await AuthService.verifySession();
  if (!(await isEnabled())) return { results: [], created: 0, scanned: 0, totalActive: 0, error: disabledError('postSearch') };

  const totalActive = await db.keyword.count({ where: { status: KeywordStatus.ACTIVE } });
  const keywords = await db.keyword.findMany({
    where: { status: KeywordStatus.ACTIVE },
    orderBy: [{ lastSearchedAt: { sort: 'asc', nulls: 'first' } }, { priority: 'desc' }],
    take: Math.min(Math.max(options.maxKeywords || 5, 1), 15),
  });
  if (!keywords.length) return { results: [], created: 0, scanned: 0, totalActive };

  const postedLimit = TIMEFRAME_TO_LIMIT[options.timeframe || '7d'] || 'week';
  const results: KeywordScanResult[] = [];
  let created = 0;
  let blocking: LinkedInErrorInfo | undefined;

  for (const kw of keywords) {
    const res = await linkedinProvider.searchPosts({ query: kw.keyword, postedLimit, maxPosts: options.maxPostsPerKeyword || 15, sortBy: 'date' });
    if (res.error) {
      results.push({ keyword: kw.keyword, found: 0, created: 0, skipped: 0, error: res.error.message });
      // Key/credit problems affect every keyword: stop instead of failing each one.
      if (['NOT_CONFIGURED', 'INVALID_KEY', 'NO_CREDITS', 'ACTOR_UNAVAILABLE'].includes(res.error.code)) {
        blocking = res.error;
        break;
      }
      continue;
    }
    // Score before saving, so the inbox opens sorted by buying intent.
    const { scores } = await scorePosts(res.items);
    const saved = await persistPosts(res.items, { matchedKeyword: kw.keyword, keywordCategory: kw.category, status: PostStatus.DISCOVERED, intents: scores });
    created += saved.created;
    results.push({ keyword: kw.keyword, found: res.items.length, created: saved.created, skipped: saved.skipped });
    await db.keyword.update({ where: { id: kw.id }, data: { lastSearchedAt: new Date(), matchesFound: { increment: saved.created } } }).catch(() => null);
  }

  safeRevalidatePath('/discovery');
  safeRevalidatePath('/keywords');
  return { results, created, scanned: results.filter((r) => !r.error).length, totalActive, error: blocking };
}

export type LinkedInInboxItem = {
  id: string;
  postUrl: string;
  authorName: string;
  authorHeadline: string | null;
  companyName: string | null;
  postPreview: string;
  matchedKeyword: string;
  postedAt: string | null;
  discoveredAt: string;
  engagementCount: number;
  status: PostStatus;
  authorProfileUrl?: string;
  /** Buying intent scored when the post was found; missing for posts saved before scoring existed. */
  intent?: PostIntent;
};

/** Posts discovered on LinkedIn that are waiting for a decision (send to review or dismiss). */
export async function getLinkedInInboxAction(): Promise<LinkedInInboxItem[]> {
  await AuthService.verifySession();
  const rows = await db.linkedInPost.findMany({
    where: { status: PostStatus.DISCOVERED, postUrl: { contains: 'linkedin.com/' } },
    orderBy: { discoveredAt: 'desc' },
    take: 60,
  }).catch(() => []);
  // Outreach targets are stored under linkedin.com/company/<domain>; those are not posts.
  const posts = rows.filter((r) => !/linkedin\.com\/company\/[^/]+$/i.test(r.postUrl));
  const meta = await getPostMetaMap();
  const items = posts.map((r): LinkedInInboxItem => ({
    id: r.id,
    postUrl: r.postUrl,
    authorName: r.authorName,
    authorHeadline: r.authorHeadline,
    companyName: r.companyName,
    postPreview: r.postPreview,
    matchedKeyword: r.matchedKeyword,
    postedAt: r.postedAt ? r.postedAt.toISOString() : null,
    discoveredAt: r.discoveredAt.toISOString(),
    engagementCount: r.engagementCount,
    status: r.status,
    authorProfileUrl: meta[r.postUrl]?.authorProfileUrl,
    intent: r.opportunityScore != null
      ? { score: r.opportunityScore, level: intentLevelFromScore(r.opportunityScore), reason: meta[r.postUrl]?.intentReason || '' }
      : undefined,
  }));
  // Strongest buying intent first; unscored posts keep their newest-first order at the end.
  return items.sort((a, b) => (b.intent?.score ?? -1) - (a.intent?.score ?? -1));
}

/** Scores inbox posts that have no intent score yet (found before scoring existed). */
export async function scoreLinkedInInboxAction(): Promise<{ scored: number; source: IntentSource }> {
  await AuthService.verifySession();
  const rows = await db.linkedInPost.findMany({
    where: { status: PostStatus.DISCOVERED, opportunityScore: null, postUrl: { contains: 'linkedin.com/' } },
    orderBy: { discoveredAt: 'desc' },
    take: 30,
  });
  if (!rows.length) return { scored: 0, source: hasAiKey() ? 'AI' : 'RULES' };

  const { scores, source } = await scorePosts(rows.map((r) => ({ id: r.id, content: r.postContent || r.postPreview, authorName: r.authorName, authorHeadline: r.authorHeadline })));
  const meta: Parameters<typeof savePostMeta>[0] = {};
  for (const row of rows) {
    const intent = scores[row.id];
    if (!intent) continue;
    await db.linkedInPost.update({ where: { id: row.id }, data: { opportunityScore: intent.score } });
    meta[row.postUrl] = { intentScore: intent.score, intentReason: intent.reason };
  }
  await savePostMeta(meta);
  return { scored: rows.length, source };
}

// ---------------------------------------------------------------------------
// Buying intent, CRM and engagement for posts
// ---------------------------------------------------------------------------

/** Scores search results for buying intent (one AI call for the whole page, keyword rules without an AI key). */
export async function scoreLinkedInPostsAction(posts: { id: string; content: string; authorName?: string; authorHeadline?: string }[]): Promise<{ scores: Record<string, PostIntent>; source: IntentSource }> {
  await AuthService.verifySession();
  return scorePosts((posts || []).filter((p) => p?.id && p.content).slice(0, 30));
}

/**
 * Turns a post into a lead in one step: the post is saved to the Review Queue (for analysis and
 * outreach drafts) and its author becomes a contact on a deal owned by the signed-in user.
 */
export async function addLinkedInPostToCrmAction(
  post: LinkedInPostResult,
  options: { matchedKeyword?: string; intent?: PostIntent } = {}
): Promise<{ match?: CrmMatch; created?: boolean; error?: string; message?: string }> {
  const user = await AuthService.verifySession();
  if (!post || !/^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(post.url || '') || !post.content || !post.authorName) {
    return { error: 'This post is missing its link, text or author.' };
  }
  try {
    const intent = cleanIntent(options.intent);
    const saved = await persistPosts([post], { matchedKeyword: options.matchedKeyword || 'LinkedIn search', status: PostStatus.REVIEW_QUEUE, intents: intent ? { [post.id]: intent } : undefined });
    const row = await db.linkedInPost.findUnique({ where: { postUrl: post.url }, select: { id: true } });

    // A company page has no person to contact; a personal post makes its author the contact.
    const isPerson = post.authorType === 'profile';
    const existingDeal = row ? await db.deal.findFirst({ where: { source: 'LINKEDIN_POST', sourceRef: row.id }, select: { id: true } }) : null;
    const result = await createLead({
      company: { name: isPerson ? post.authorCompany?.trim() || `${post.authorName} (independent)` : post.authorName },
      contact: isPerson ? { name: post.authorName, title: post.authorHeadline, linkedinUrl: post.authorProfileUrl, sourcePostUrl: post.url } : null,
      source: 'LINKEDIN_POST',
      // The Review Queue sync may already have made a deal for this post.
      sourceRef: existingDeal ? null : row?.id,
      ownerId: user.id,
      actorId: user.id,
      note: {
        title: 'Added from a LinkedIn post',
        details: [intent && `Buying intent: ${intent.level} (${intent.score}/100). ${intent.reason}`, clip(post.content.replace(/\s+/g, ' '), 400)].filter(Boolean).join('\n\n'),
      },
    });
    // Attached to a deal that already existed: stop the Review Queue sync from adding the post again.
    if (!result.created && row) await ignorePostForCrmSync(row.id);

    const lookup = await lookupCrmMatches(user, { companies: [{ key: 'c', name: result.companyName }] });
    safeRevalidatePath('/crm');
    safeRevalidatePath('/review');
    return {
      created: result.created,
      match: lookup.companies.c,
      message: result.created
        ? `${result.companyName} added to your pipeline${saved.created ? ' and the post sent to the Review Queue' : ''}.`
        : result.claimed
          ? `${result.companyName} already had an unassigned deal. It is now yours.`
          : `${result.companyName} already has an open deal (${result.ownerName ? `owner: ${result.ownerName}` : 'unassigned'}). The author was added there.`,
    };
  } catch (err) {
    logger.error(`Could not add LinkedIn post ${post.url} to the CRM`, err);
    return { error: 'Could not add this post to the CRM. Please try again.' };
  }
}

/** Drafts a short comment for engaging with a post before reaching out (needs the AI key). */
export async function draftLinkedInCommentAction(post: { content: string; authorName?: string; authorHeadline?: string }): Promise<{ comment?: string; error?: string }> {
  const user = await AuthService.verifySession();
  if (!post?.content?.trim()) return { error: 'This post has no text to comment on.' };
  if (!hasAiKey()) return { error: 'Comment drafts need GEMINI_API_KEY to be set in the environment.' };
  try {
    return { comment: await draftComment(post, user.name) };
  } catch (err) {
    logger.error('LinkedIn comment draft failed', err);
    if (/429/.test(String(err))) return { error: 'The AI model has reached its request limit. Wait a minute and try again.' };
    return { error: 'The comment could not be drafted right now. Please try again.' };
  }
}

export async function updateLinkedInPostStatusAction(postId: string, status: 'REVIEW_QUEUE' | 'DISMISSED'): Promise<{ success: boolean }> {
  await AuthService.verifySession();
  try {
    await db.linkedInPost.update({ where: { id: postId }, data: { status: status === 'REVIEW_QUEUE' ? PostStatus.REVIEW_QUEUE : PostStatus.DISMISSED } });
    safeRevalidatePath('/review');
    safeRevalidatePath('/crm');
    return { success: true };
  } catch (err) {
    logger.error(`Could not update LinkedIn post ${postId}`, err);
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// People & companies
// ---------------------------------------------------------------------------

const splitList = (v?: string) => (v ? v.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean) : []);

export async function searchLinkedInPeopleAction(params: {
  query?: string;
  jobTitles?: string;
  locations?: string;
  companyName?: string;
  companyUrl?: string;
  maxItems?: number;
}): Promise<{ items: LinkedInProfileResult[]; error?: LinkedInErrorInfo; note?: string; cached?: boolean }> {
  await AuthService.verifySession();
  if (!(await isEnabled())) return { items: [], error: disabledError('profileSearch') };

  // The people search filters by company LinkedIn URL, so resolve a typed company name first.
  let companyUrl = params.companyUrl?.trim();
  let note: string | undefined;
  if (!companyUrl && params.companyName?.trim()) {
    const found = await findLinkedInCompany({ name: params.companyName.trim() });
    if (found.error) return { items: [], error: found.error };
    if (!found.company) return { items: [], note: found.note || `No LinkedIn company page found for "${params.companyName}".` };
    companyUrl = found.company.linkedinUrl;
    note = `Searching people at ${found.company.name}.`;
  }

  const res = await linkedinProvider.searchProfiles({
    query: params.query,
    jobTitles: splitList(params.jobTitles),
    locations: splitList(params.locations),
    companyUrls: companyUrl ? [companyUrl] : undefined,
    maxItems: params.maxItems,
  });
  return { items: res.items, error: res.error, note, cached: res.cached };
}

export type LinkedInCompanyInsights = {
  company: LinkedInCompanyResult | null;
  posts: LinkedInPostResult[];
  error?: LinkedInErrorInfo;
  note?: string;
};

/** Company page + recent company posts for the Company 360 LinkedIn panel (runs only when asked). */
export async function getLinkedInCompanyInsightsAction(params: { domain?: string; companyName?: string; linkedinUrl?: string }): Promise<LinkedInCompanyInsights> {
  await AuthService.verifySession();
  if (!(await isEnabled())) return { company: null, posts: [], error: disabledError('company') };
  const found = await findLinkedInCompany({ domain: params.domain, name: params.companyName, linkedinUrl: params.linkedinUrl });
  if (!found.company) return { company: null, posts: [], error: found.error, note: found.note || 'No matching LinkedIn company page was found.' };
  const posts = await linkedinProvider.getRecentPosts(found.company.linkedinUrl, 5);
  return { company: found.company, posts: posts.items, error: posts.error };
}

/** Senior people at a company, for picking who to contact. */
export async function getLinkedInCompanyPeopleAction(params: { companyLinkedinUrl: string; jobTitles?: string; maxItems?: number }): Promise<{ items: LinkedInProfileResult[]; error?: LinkedInErrorInfo }> {
  await AuthService.verifySession();
  if (!(await isEnabled())) return { items: [], error: disabledError('companyEmployees') };
  const res = await linkedinProvider.getCompanyPeople({
    companyUrl: params.companyLinkedinUrl,
    jobTitles: splitList(params.jobTitles || 'Founder, CEO, CTO, Head of Engineering, VP Engineering, Head of Product'),
    maxItems: params.maxItems || 8,
  });
  return { items: res.items, error: res.error };
}

// ---------------------------------------------------------------------------
// Prospect research for AI outreach
// ---------------------------------------------------------------------------

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max).trim()}…` : text);

function buildResearchNotes(profile: LinkedInProfileResult, posts: LinkedInPostResult[]): string {
  const lines: string[] = [];
  lines.push(`LinkedIn profile of ${profile.fullName}${profile.headline ? `: ${clip(profile.headline, 160)}` : ''}`);
  if (profile.jobTitle || profile.companyName) lines.push(`Current role: ${[profile.jobTitle, profile.companyName].filter(Boolean).join(' at ')}${profile.location ? ` (${profile.location})` : ''}`);
  if (profile.about) lines.push(`About (their own words): ${clip(profile.about.replace(/\s+/g, ' '), 650)}`);
  const own = posts.filter((p) => p.content).slice(0, 3);
  if (own.length) {
    lines.push('Recent posts:');
    own.forEach((p) => lines.push(`- ${p.postedAt ? `${p.postedAt.slice(0, 10)}: ` : ''}"${clip(p.content.replace(/\s+/g, ' '), 300)}"`));
  }
  return clip(lines.join('\n'), 1950);
}

/**
 * Builds "Prospect research" notes for the outreach generator from the contact's real LinkedIn
 * profile and recent posts. With no profile URL it looks the person up at their company by first name and title.
 */
export async function importLinkedInResearchAction(params: {
  linkedinUrl?: string;
  contactName?: string;
  contactTitle?: string;
  companyName?: string;
  domain?: string;
}): Promise<{ notes?: string; profileUrl?: string; fullName?: string; error?: string }> {
  await AuthService.verifySession();
  if (!(await isEnabled())) return { error: disabledError('profile').message };

  let profile: LinkedInProfileResult | null = null;
  const url = params.linkedinUrl?.trim();

  if (url && /linkedin\.com\/in\//i.test(url)) {
    const res = await linkedinProvider.getProfile(url);
    if (res.error) return { error: res.error.message };
    profile = res.profile;
  } else {
    // Apollo masks surnames ("Neha Ja***n"), so match on first name + title inside the company.
    const firstName = (params.contactName || '').split(/\s+/)[0]?.replace(/[^\p{L}]/gu, '');
    if (!firstName) return { error: 'Add the contact\'s LinkedIn profile URL to import their research.' };
    const found = await findLinkedInCompany({ domain: params.domain, name: params.companyName });
    if (found.error) return { error: found.error.message };
    if (!found.company) return { error: found.note || 'Could not find this company on LinkedIn. Paste the contact\'s LinkedIn profile URL instead.' };

    const people = await linkedinProvider.getCompanyPeople({ companyUrl: found.company.linkedinUrl, query: firstName, maxItems: 10 });
    if (people.error) return { error: people.error.message };
    const sameFirst = people.items.filter((p) => (p.firstName || p.fullName).toLowerCase().startsWith(firstName.toLowerCase()));
    const titleWords = (params.contactTitle || '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
    const score = (p: LinkedInProfileResult) => titleWords.filter((w) => `${p.jobTitle || ''} ${p.headline || ''}`.toLowerCase().includes(w)).length;
    profile = sameFirst.sort((a, b) => score(b) - score(a))[0] || null;
    if (!profile) return { error: `No one named ${firstName} was found at ${found.company.name} on LinkedIn. Paste their profile URL instead.` };
    // Search results may be "short" profiles; fetch the full one for the About section.
    if (!profile.about) profile = (await linkedinProvider.getProfile(profile.profileUrl)).profile || profile;
  }

  if (!profile) return { error: 'LinkedIn returned no profile for this contact.' };
  const posts = await linkedinProvider.getRecentPosts(profile.profileUrl, 3);
  return { notes: buildResearchNotes(profile, posts.items), profileUrl: profile.profileUrl, fullName: profile.fullName };
}

// ---------------------------------------------------------------------------
// Existing exports (now backed by live data)
// ---------------------------------------------------------------------------

export async function getLinkedInCompanyDataAction(domainOrName: string): Promise<LinkedInIntelligenceData> {
  try {
    await AuthService.verifySession();
    return await getLinkedInCompanyData(domainOrName);
  } catch (err: unknown) {
    logger.error(`Failed to fetch LinkedIn data for '${domainOrName}'`, { error: String(err) });
    throw new AppError('Failed to fetch LinkedIn intelligence data.', 500);
  }
}

export async function analyzeLinkedInOrganicAction(domainOrName: string) {
  try {
    await AuthService.verifySession();
    return await analyzeLinkedInOrganicIntelligence(domainOrName);
  } catch (err: unknown) {
    logger.error(`Failed to analyze LinkedIn organic data for '${domainOrName}'`, { error: String(err) });
    throw new AppError('LinkedIn analysis failed.', 500);
  }
}

/** LinkedIn activity counts from our own database (posts we actually discovered). */
export async function getLinkedInAnalyticsAction(): Promise<LinkedInAnalyticsTelemetry> {
  await AuthService.verifySession();
  const postFilter = { postUrl: { contains: 'linkedin.com/posts' } };
  const [indexed, hiring, ai, engagement, byKeyword] = await Promise.all([
    db.linkedInPost.count({ where: postFilter }).catch(() => 0),
    db.linkedInPost.count({ where: { ...postFilter, postPreview: { contains: 'hiring', mode: 'insensitive' } } }).catch(() => 0),
    db.linkedInPost.count({ where: { ...postFilter, postPreview: { contains: ' AI ', mode: 'insensitive' } } }).catch(() => 0),
    db.linkedInPost.aggregate({ where: postFilter, _avg: { engagementCount: true } }).catch(() => null),
    db.linkedInPost.groupBy({ by: ['matchedKeyword'], where: postFilter, _count: { _all: true }, orderBy: { _count: { matchedKeyword: 'desc' } }, take: 4 }).catch(() => []),
  ]);
  const rate = await getLinkedInRateLimit().catch(() => null);

  return {
    apiCallsToday: 0,
    executivePostsIndexed: indexed,
    hiringAnnouncementsFound: hiring,
    aiTransformationSignals: ai,
    averageEngagementScore: Math.round(engagement?._avg.engagementCount || 0),
    cacheHitRatePercent: 0,
    averageResponseTimeMs: rate ? 0 : 0,
    topHiringRoleCategories: byKeyword.map((k) => ({ category: k.matchedKeyword, openingsCount: k._count._all, urgencyScore: 0 })),
  };
}
