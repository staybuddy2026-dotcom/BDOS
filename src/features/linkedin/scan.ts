import { KeywordStatus, PostStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { linkedinProvider, PostedLimit } from './provider';
import { savePostMeta } from './store';
import { intentLevelFromScore, scorePosts } from './intent';
import type { PostIntent } from './intent';
import type { LinkedInErrorInfo, LinkedInPostResult } from './types';

/**
 * Saving LinkedIn posts and scanning the keyword library. Shared by the signed-in actions
 * (features/linkedin/actions.ts) and the overnight job (features/linkedin/nightly.ts), so it is
 * a plain server module rather than a server action: nothing here checks who is calling.
 */

/** Intent scores sent back by the browser are only trusted as far as "a number between 0 and 100". */
export function cleanIntent(intent?: PostIntent): PostIntent | undefined {
  const score = Math.round(Number(intent?.score));
  if (!intent || !Number.isFinite(score)) return undefined;
  const bounded = Math.max(0, Math.min(100, score));
  return { score: bounded, level: intentLevelFromScore(bounded), reason: String(intent.reason || '').slice(0, 200) };
}

export async function persistPosts(
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

const TIMEFRAME_TO_LIMIT: Record<string, PostedLimit> = { '1h': '1h', '24h': '24h', '7d': 'week', week: 'week', '30d': 'month', month: 'month' };

export type KeywordScanResult = {
  keyword: string;
  found: number;
  created: number;
  skipped: number;
  error?: string;
};

/** Key or credit problems stop a whole run: every further call would fail the same way. */
export const BLOCKING_LINKEDIN_ERRORS = ['NOT_CONFIGURED', 'INVALID_KEY', 'NO_CREDITS', 'ACTOR_UNAVAILABLE'];

/**
 * Searches LinkedIn for the active keywords (least recently scanned first), scores the posts for
 * buying intent and saves new ones as discovered leads. Capped per run to keep scraper cost predictable.
 */
export async function runKeywordScan(options: {
  timeframe?: string;
  maxKeywords?: number;
  maxPostsPerKeyword?: number;
} = {}): Promise<{ results: KeywordScanResult[]; created: number; scanned: number; totalActive: number; error?: LinkedInErrorInfo }> {
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
      if (BLOCKING_LINKEDIN_ERRORS.includes(res.error.code)) {
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

  return { results, created, scanned: results.filter((r) => !r.error).length, totalActive, error: blocking };
}
