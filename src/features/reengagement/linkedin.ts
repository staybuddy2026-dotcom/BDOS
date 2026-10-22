import { ApprovalStatus, DraftStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { linkedinProvider, isLinkedInConfigured } from '@/features/linkedin/provider';
import { isLinkedInEnabledSetting } from '@/features/linkedin/settings';
import { getPostMetaMap } from '@/features/linkedin/store';
import { draftReEngagementMessage, scorePosts } from '@/features/linkedin/intent';
import { BLOCKING_LINKEDIN_ERRORS } from '@/features/linkedin/scan';
import type { LinkedInErrorInfo } from '@/features/linkedin/types';

/**
 * Re-engagement from LinkedIn activity: for leads we contacted who have not replied, look at their
 * recent LinkedIn posts. A post since our last message that shows buying intent becomes a
 * re-engagement event with a drafted follow-up (approved or dismissed on the Re-engagement page).
 *
 * Every profile check is a paid scraper run, so each run checks a few prospects and the same
 * prospect at most once every few days.
 */

const CHECKED_KEY = 'linkedin_reengagement_checked';
const MAX_PER_RUN = 10;
const RECHECK_DAYS = 3;
/** WARM or HOT: a post must show a real trigger, not just be recent. */
const MIN_INTENT = 40;

type CheckedMap = Record<string, string>;

async function readChecked(): Promise<CheckedMap> {
  try {
    const row = await db.applicationSettings.findUnique({ where: { key: CHECKED_KEY } });
    return row?.value ? (JSON.parse(row.value) as CheckedMap) : {};
  } catch {
    return {};
  }
}

async function writeChecked(map: CheckedMap): Promise<void> {
  // Keep it small: only the most recent checks matter for the "every few days" rule.
  const value = JSON.stringify(Object.fromEntries(Object.entries(map).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 2000)));
  await db.applicationSettings.upsert({ where: { key: CHECKED_KEY }, update: { value }, create: { key: CHECKED_KEY, value } }).catch((err) => {
    logger.warn('Could not save LinkedIn re-engagement checks', { error: String(err) });
  });
}

const profileUrlOf = (url?: string | null) => (url && /linkedin\.com\/in\//i.test(url) ? url : undefined);

export type LinkedInReEngagementResult = { checked: number; created: number; skipped?: string; error?: LinkedInErrorInfo };

export async function scanLinkedInReEngagements(now = new Date()): Promise<LinkedInReEngagementResult> {
  if (!(await isLinkedInConfigured())) return { checked: 0, created: 0, skipped: 'LinkedIn is not connected.' };
  if (!(await isLinkedInEnabledSetting())) return { checked: 0, created: 0, skipped: 'LinkedIn is turned off in Settings.' };

  // Contacted, no reply yet, and the sequence was not stopped by a reply, meeting or closed deal.
  const drafts = await db.outreachDraft.findMany({
    where: { status: { in: [DraftStatus.SENT, DraftStatus.FOLLOW_UP_DUE, DraftStatus.COMPLETED] }, stoppedReason: null },
    include: {
      post: { select: { postUrl: true, authorName: true } },
      owner: { select: { name: true } },
      deal: { select: { primaryContact: { select: { name: true, linkedinUrl: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  if (!drafts.length) return { checked: 0, created: 0 };

  const meta = await getPostMetaMap();
  const checked = await readChecked();
  const recheckBefore = now.getTime() - RECHECK_DAYS * 86400000;

  // One check per person, least recently checked first.
  const seen = new Set<string>();
  const candidates = drafts
    .map((d) => ({
      draft: d,
      profileUrl: profileUrlOf(d.deal?.primaryContact?.linkedinUrl) || profileUrlOf(meta[d.post.postUrl]?.authorProfileUrl),
      name: d.deal?.primaryContact?.name || d.toName || d.post.authorName,
    }))
    .filter((c): c is typeof c & { profileUrl: string } => !!c.profileUrl)
    .filter((c) => (seen.has(c.profileUrl) ? false : (seen.add(c.profileUrl), true)))
    .filter((c) => !checked[c.profileUrl] || Date.parse(checked[c.profileUrl]) < recheckBefore)
    .sort((a, b) => (checked[a.profileUrl] || '').localeCompare(checked[b.profileUrl] || ''))
    .slice(0, MAX_PER_RUN);

  let created = 0;
  let count = 0;
  let blocking: LinkedInErrorInfo | undefined;

  for (const { draft, profileUrl, name } of candidates) {
    const res = await linkedinProvider.getRecentPosts(profileUrl, 5);
    if (res.error) {
      if (BLOCKING_LINKEDIN_ERRORS.includes(res.error.code)) {
        blocking = res.error;
        break;
      }
      logger.warn(`Re-engagement: LinkedIn posts for ${profileUrl} unavailable: ${res.error.message}`);
      continue;
    }
    count++;
    checked[profileUrl] = now.toISOString();

    // Only posts written after our last message can be a new reason to reach out.
    const lastContact = draft.sentAt || draft.approvedAt || draft.createdAt;
    const fresh = res.items.filter((p) => p.postedAt && Date.parse(p.postedAt) > lastContact.getTime());
    if (!fresh.length) continue;

    const { scores } = await scorePosts(fresh.map((p) => ({ id: p.id, content: p.content, authorName: p.authorName, authorHeadline: p.authorHeadline })));
    const best = fresh
      .map((p) => ({ post: p, intent: scores[p.id] }))
      .filter((x) => x.intent && x.intent.score >= MIN_INTENT)
      .sort((a, b) => b.intent!.score - a.intent!.score)[0];
    if (!best) continue;

    // The post link is part of the signal, so the same post never creates a second event.
    const already = await db.reEngagementEvent.findFirst({ where: { newBuyingSignal: { contains: best.post.url } }, select: { id: true } });
    if (already) continue;

    const snippet = best.post.content.replace(/\s+/g, ' ').slice(0, 280);
    const previous = draft.editedDraft || draft.originalAiDraft;
    try {
      await db.reEngagementEvent.create({
        data: {
          outreachDraftId: draft.id,
          prospectName: name,
          newBuyingSignal: `New LinkedIn post${best.post.postedAt ? ` (${best.post.postedAt.slice(0, 10)})` : ''}: "${snippet}${best.post.content.length > 280 ? '…' : ''}" ${best.post.url}`,
          analysis: `Buying intent ${best.intent!.level} (${best.intent!.score}/100): ${best.intent!.reason} Last contacted ${lastContact.toISOString().slice(0, 10)}; no reply since.`,
          generatedDraft: await draftReEngagementMessage({ prospectName: name, postContent: best.post.content, previousMessage: previous, senderName: draft.owner?.name }),
          approvalStatus: ApprovalStatus.PENDING,
        },
      });
      created++;
    } catch (err) {
      logger.error(`Could not save a LinkedIn re-engagement event for ${name}`, err);
    }
  }

  await writeChecked(checked);
  if (created) logger.info(`LinkedIn re-engagement: ${created} new event${created === 1 ? '' : 's'} from ${count} profile${count === 1 ? '' : 's'}.`);
  return { checked: count, created, error: blocking };
}
