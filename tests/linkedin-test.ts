import { setupTestEnvironment } from './setup';
import { KeywordStatus, Priority, PostStatus, DraftStatus, FollowUpStatus } from '@prisma/client';
import { db } from '../src/lib/db';
import { linkedinProvider, mapProfile, resetLinkedInKeyCache } from '../src/features/linkedin/provider';
import { draftConnectionNote, scorePostByRules } from '../src/features/linkedin/intent';
import { runKeywordScan } from '../src/features/linkedin/scan';
import { savePostMeta } from '../src/features/linkedin/store';
import { isNightlyScanEnabled, NIGHTLY_SETTING, runNightlyLinkedIn } from '../src/features/linkedin/nightly';
import { scanLinkedInReEngagements } from '../src/features/reengagement/linkedin';
import { scheduleLinkedInConnectStep } from '../src/features/outreach/linkedinStep';

/**
 * LinkedIn integration tests. Apify is simulated (no real token or credit is used): the scrapers
 * answer only for this test's own keyword and profile, and every database row and setting the
 * test touches is put back afterwards.
 *
 * Run with: npx tsx tests/linkedin-test.ts
 */

setupTestEnvironment();
process.env.LINKEDIN_SCRAPER_API_KEY = 'apify_api_TESTTOKEN123';

const RUN = Date.now().toString(36);
const TEST_KEYWORD = `bdos-li-test-${RUN}`;
const TEST_PROFILE = `https://www.linkedin.com/in/bdos-test-${RUN}`;
const postUrl = (n: number) => `https://www.linkedin.com/posts/bdos-test-${RUN}-${n}`;

let apifyMode: 'ok' | 'no-credit' | 'timed-out' | 'run-failed' = 'ok';
const realFetch = globalThis.fetch;

// --- Simulated Apify API ------------------------------------------------------
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!url.includes('api.apify.com')) return realFetch(input, init);
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  if (apifyMode === 'no-credit') return json({ error: { type: 'not-enough-usage-to-run-paid-actor', message: 'Not enough usage' } }, 402);
  if (apifyMode === 'timed-out') return json({ error: { type: 'run-failed', message: 'Actor run did not succeed (run ID: abc, status: TIMED-OUT)' } }, 400);
  if (apifyMode === 'run-failed') return json({ error: { type: 'run-failed', message: 'Actor run did not succeed (run ID: abc, status: FAILED)' } }, 400);

  if (url.endsWith('/users/me')) return json({ data: { username: 'bdos-tester' } });
  if (url.endsWith('/users/me/limits')) return json({ data: { current: { monthlyUsageUsd: 1.5 }, limits: { maxMonthlyUsageUsd: 5 } } });

  const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
  if (url.includes('linkedin-post-search')) {
    if ((body.searchQueries as string[])?.[0] !== TEST_KEYWORD) return json([]);
    return json([
      {
        id: `p1-${RUN}`, linkedinUrl: postUrl(1),
        content: 'We are looking for a development agency to build our new SaaS platform. Who can help?',
        author: { name: 'Riya Shah', info: 'CTO at Acme Health', linkedinUrl: TEST_PROFILE, type: 'profile' },
        engagement: { likes: 12, comments: 4, shares: 1 }, postedAt: { date: new Date().toISOString() },
      },
      {
        id: `p2-${RUN}`, linkedinUrl: postUrl(2),
        content: 'Happy Friday everyone! Enjoy the weekend.',
        author: { name: 'Someone Else', info: 'Coach', linkedinUrl: 'https://www.linkedin.com/in/someone-else', type: 'profile' },
        engagement: { likes: 3, comments: 0, shares: 0 }, postedAt: { date: new Date().toISOString() },
      },
    ]);
  }
  if (url.includes('linkedin-profile-posts')) {
    if ((body.targetUrls as string[])?.[0] !== TEST_PROFILE) return json([]);
    return json([{
      id: `p3-${RUN}`, linkedinUrl: postUrl(3),
      content: 'We need a dev team to rebuild our mobile app this quarter. Looking for a partner, send me your portfolio.',
      author: { name: 'Riya Shah', info: 'CTO at Acme Health', linkedinUrl: TEST_PROFILE, type: 'profile' },
      engagement: { likes: 20, comments: 6, shares: 2 }, postedAt: { date: new Date().toISOString() },
    }]);
  }
  return json([]);
}) as typeof fetch;

// --- Helpers ------------------------------------------------------------------
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(` ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(` ❌ FAIL: ${name}\n    ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

/** Settings rows the LinkedIn code writes; restored as they were after the run. */
const TOUCHED_SETTINGS = ['linkedin_post_meta', 'linkedin_reengagement_checked', 'linkedinNightlyLastRun', 'linkedinNightlyLastResult', 'linkedinNightlyScan', NIGHTLY_SETTING];

async function main() {
  const dbOnline = await db.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

  // ---- Without the database ----
  await test('Connection note is short enough for LinkedIn and signed by the sender', async () => {
    const { note, source } = await draftConnectionNote({ contactName: 'Riya Shah', companyName: 'Acme Health', emailSubject: 'Scaling your patient app', senderName: 'Amit Kumar', emailBody: 'Hi Riya, ...' });
    assert(source === 'RULES', 'without an AI key the plain note is used');
    assert(note.length <= 300, `note must fit LinkedIn's 300 characters (was ${note.length})`);
    assert(note.startsWith('Hi Riya'), 'note greets the contact by first name');
    assert(note.endsWith('Amit'), 'note is signed with the sender\'s first name');
  });

  await test('Apify results are mapped into posts and the account check reads usage', async () => {
    const res = await linkedinProvider.searchPosts({ query: TEST_KEYWORD });
    assert(!res.error, `no error expected (${res.error?.message})`);
    assert(res.items.length === 2, 'two posts returned');
    assert(res.items[0].authorCompany === 'Acme Health', 'company read from the author headline');
    assert(res.items[0].authorProfileUrl === TEST_PROFILE, 'author profile URL kept');
    const account = await linkedinProvider.checkAccount();
    assert(account.ok && account.account === 'bdos-tester', 'account connected');
    assert(account.monthlyLimitUsd === 5 && account.monthlyUsageUsd === 1.5, 'usage and limit reported');
  });

  await test('No Apify credit is reported clearly and stops the run', async () => {
    apifyMode = 'no-credit';
    try {
      const res = await linkedinProvider.searchPosts({ query: `${TEST_KEYWORD}-credit` });
      assert(res.error?.code === 'NO_CREDITS', `expected NO_CREDITS, got ${res.error?.code}`);
    } finally {
      apifyMode = 'ok';
    }
  });

  await test('Agencies advertising their services are not scored as buyers', async () => {
    const ads = [
      'We’re happy to be working with SD Creative Agency, supporting their team with technical expertise and development work behind the scenes.\n\nLooking for a technical partner for your creative or marketing agency?\nLet’s connect us.',
      'YOUR AGENCY. OUR TECHNOLOGY TEAM. SHARED GROWTH.\n\nA Reliable Technology Partner for Agencies, Consultants & Businesses\n\nExpand your delivery capabilities without building every technical resource in-house.\n\nOUR TECHNOLOGY CAPABILITIES\neCommerce & Shopify\nShopify Development, Plus, Migration & CRO',
    ];
    for (const content of ads) {
      const r = scorePostByRules({ id: 'x', content });
      assert(r.level === 'COLD', `ad scored ${r.level} ${r.score} (${r.reason}): ${content.slice(0, 50)}`);
    }
    const buyers = [
      'We are looking for a development agency to build our new SaaS platform. Who can help?',
      'Can anyone recommend a good React agency? We need to rebuild our customer portal. Agencies, DM us.',
    ];
    for (const content of buyers) {
      const r = scorePostByRules({ id: 'x', content });
      assert(r.level === 'HOT', `buyer scored ${r.level} (${r.reason}): ${content.slice(0, 50)}`);
    }
  });

  await test('People at a company show their role at that company, not another current job', async () => {
    const item = {
      firstName: 'Georg', lastName: 'Doll', linkedinUrl: 'https://www.linkedin.com/in/georgdoll',
      currentPosition: [{ position: 'SVP/CTO', companyName: 'Bosch', companyLinkedinUrl: 'https://www.linkedin.com/company/bosch/', companyId: '2508619' }],
      experience: [
        { position: 'SVP/CTO', companyName: 'Bosch', companyLinkedinUrl: 'https://www.linkedin.com/company/bosch/', endDate: { text: 'Present' } },
        { position: 'CTO, Automotive', companyName: 'Microsoft', companyLinkedinUrl: 'https://www.linkedin.com/company/microsoft/', companyId: '1035', endDate: { text: 'Present' } },
        { position: 'Architect', companyName: 'Microsoft', companyLinkedinUrl: 'https://www.linkedin.com/company/microsoft/', endDate: { text: 'Jan 2020' } },
      ],
    };
    const plain = mapProfile(item);
    assert(plain?.companyName === 'Bosch', 'without a company the first current job is shown');
    const atMs = mapProfile(item, 'https://www.linkedin.com/company/microsoft');
    assert(atMs?.companyName === 'Microsoft' && atMs.jobTitle === 'CTO, Automotive', `role at Microsoft shown (${atMs?.jobTitle} @ ${atMs?.companyName})`);
    assert(mapProfile(item, 'https://www.linkedin.com/company/1035')?.companyName === 'Microsoft', 'numeric company URLs match too');
  });

  await test('Timed-out and failed scraper runs are reported as such', async () => {
    try {
      apifyMode = 'timed-out';
      const slow = await linkedinProvider.searchPosts({ query: `${TEST_KEYWORD}-slow` });
      assert(slow.error?.code === 'TIMEOUT', `expected TIMEOUT, got ${slow.error?.code}`);
      apifyMode = 'run-failed';
      const broken = await linkedinProvider.searchPosts({ query: `${TEST_KEYWORD}-broken` });
      assert(broken.error?.code === 'HTTP_ERROR' && /did not finish/.test(broken.error.message), `expected a run failure, got ${broken.error?.code}: ${broken.error?.message}`);
    } finally {
      apifyMode = 'ok';
    }
  });

  await test('Saving a new key re-checks the account instead of using the cached result', async () => {
    assert((await linkedinProvider.checkAccount()).ok, 'account connected (and cached)');
    apifyMode = 'no-credit';
    try {
      assert((await linkedinProvider.checkAccount()).ok, 'cached result reused within the minute');
      resetLinkedInKeyCache();
      const fresh = await linkedinProvider.checkAccount();
      assert(!fresh.ok && fresh.error?.code === 'NO_CREDITS', `after reset the account is checked again (got ${fresh.error?.code})`);
    } finally {
      apifyMode = 'ok';
      resetLinkedInKeyCache();
    }
  });

  await test('Nightly job waits for its hour and respects the off switch', async () => {
    const early = new Date();
    early.setHours(0, 30, 0, 0);
    assert((await runNightlyLinkedIn(early)) === null, 'nothing runs before LINKEDIN_NIGHTLY_HOUR');
    process.env.LINKEDIN_NIGHTLY_SCAN = 'false';
    const late = new Date();
    late.setHours(23, 0, 0, 0);
    assert((await runNightlyLinkedIn(late)) === null, 'LINKEDIN_NIGHTLY_SCAN=false turns it off');
    delete process.env.LINKEDIN_NIGHTLY_SCAN;
  });

  if (!dbOnline) {
    console.log(' ⚠️  Database not reachable: skipping the database tests.');
  } else {
    const savedSettings = await db.applicationSettings.findMany({ where: { key: { in: TOUCHED_SETTINGS } } });
    const activeKeywords = await db.keyword.findMany({ where: { status: KeywordStatus.ACTIVE }, select: { id: true, lastSearchedAt: true, matchesFound: true } });
    const createdPostUrls = [postUrl(1), postUrl(2), postUrl(3)];
    let keywordId: string | undefined;
    let draftPostId: string | undefined;

    try {
      await test('Nightly job spends nothing until someone turns it on', async () => {
        delete process.env.LINKEDIN_NIGHTLY_SCAN;
        await db.applicationSettings.deleteMany({ where: { key: NIGHTLY_SETTING } });
        assert(!(await isNightlyScanEnabled()), 'off by default');
        const late = new Date();
        late.setHours(23, 0, 0, 0);
        assert((await runNightlyLinkedIn(late)) === null, 'nothing runs while it is off');
        await db.applicationSettings.create({ data: { key: NIGHTLY_SETTING, value: 'true' } });
        assert(await isNightlyScanEnabled(), 'turning it on in Settings enables it');
        process.env.LINKEDIN_NIGHTLY_SCAN = 'false';
        assert(!(await isNightlyScanEnabled()), 'LINKEDIN_NIGHTLY_SCAN=false still wins');
        delete process.env.LINKEDIN_NIGHTLY_SCAN;
      });

      await test('Keyword scan saves new posts, scored for buying intent, without duplicates', async () => {
        const kw = await db.keyword.create({ data: { keyword: TEST_KEYWORD, category: 'Test', priority: Priority.HIGH, status: KeywordStatus.ACTIVE } });
        keywordId = kw.id;
        const first = await runKeywordScan({ maxKeywords: 15, maxPostsPerKeyword: 5 });
        const mine = first.results.find((r) => r.keyword === TEST_KEYWORD);
        assert(mine && mine.found === 2 && mine.created === 2, `two posts saved for the test keyword (${JSON.stringify(mine)})`);
        const hot = await db.linkedInPost.findUnique({ where: { postUrl: postUrl(1) } });
        assert(hot?.status === PostStatus.DISCOVERED, 'saved as discovered (LinkedIn inbox)');
        assert((hot?.opportunityScore ?? 0) >= 70, `agency request scored HOT (${hot?.opportunityScore})`);
        const cold = await db.linkedInPost.findUnique({ where: { postUrl: postUrl(2) } });
        assert((cold?.opportunityScore ?? 100) < 40, `small talk scored COLD (${cold?.opportunityScore})`);

        await db.keyword.update({ where: { id: kw.id }, data: { lastSearchedAt: null } });
        const second = await runKeywordScan({ maxKeywords: 15, maxPostsPerKeyword: 5 });
        const again = second.results.find((r) => r.keyword === TEST_KEYWORD);
        assert(again && again.created === 0 && again.skipped === 2, 'the same posts are not saved twice');
      });

      await test('A contacted lead\'s new LinkedIn post becomes a re-engagement event', async () => {
        const post = await db.linkedInPost.create({
          data: { postUrl: `https://linkedin.com/company/bdos-test-${RUN}`, authorName: 'Riya Shah', authorHeadline: 'CTO at Acme Health', companyName: 'Acme Health', postPreview: 'Test outreach', matchedKeyword: 'AI Outreach Sequence', status: PostStatus.APPROVED },
        });
        draftPostId = post.id;
        await db.outreachDraft.create({
          data: { postId: post.id, originalAiDraft: 'Hi Riya, we build healthcare apps.', status: DraftStatus.SENT, sentAt: new Date(Date.now() - 2 * 86400000), channel: 'EMAIL', toName: 'Riya Shah' },
        });
        await savePostMeta({ [post.postUrl]: { authorProfileUrl: TEST_PROFILE } });

        const res = await scanLinkedInReEngagements();
        assert(!res.error, `no error (${res.error?.message})`);
        const event = await db.reEngagementEvent.findFirst({ where: { newBuyingSignal: { contains: postUrl(3) } } });
        assert(event, 'an event was created from the new post');
        assert(event.prospectName === 'Riya Shah' && event.approvalStatus === 'PENDING', 'event is for the prospect and waits for approval');
        assert(/Buying intent (HOT|WARM)/.test(event.analysis), 'analysis states the buying intent');
        assert(!!event.generatedDraft && event.generatedDraft.startsWith('Hi Riya'), 'a follow-up was drafted');

        const again = await scanLinkedInReEngagements();
        const count = await db.reEngagementEvent.count({ where: { newBuyingSignal: { contains: postUrl(3) } } });
        assert(again.checked === 0 && count === 1, 'the profile is not re-checked within 3 days and no duplicate event appears');
      });

      await test('An email sequence gets a LinkedIn connection request in Today', async () => {
        assert(draftPostId, 'test post exists');
        const draft = {
          id: `draft_test_${RUN}`, companyId: '', domain: 'acmehealth.com', companyName: 'Acme Health',
          targetContactName: 'Riya Shah', targetContactTitle: 'CTO', targetContactLinkedin: TEST_PROFILE,
          channel: 'EMAIL' as const, category: 'COLD_OUTREACH' as const, tone: 'CONSULTATIVE' as const,
          subjectLine: 'Scaling your patient app', bodyContent: 'Hi Riya, ...', personalizationScore: 0, technicalRelevanceScore: 0,
          readabilityScore: 0, spamRiskIndicator: 'LOW' as const, status: 'DRAFT' as const, followupStage: 'STAGE_1_INITIAL' as const,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        const owner = await db.user.findFirst({ select: { id: true, name: true } });
        assert(owner, 'a user exists to own the sequence');
        const start = new Date();
        const added = await scheduleLinkedInConnectStep({ draft, firstStep: { subjectLine: draft.subjectLine, bodyContent: draft.bodyContent }, postId: draftPostId, dealId: null, start, senderName: owner.name, ownerId: owner.id });
        assert(added, 'the LinkedIn step was scheduled');
        const step = await db.followUp.findFirst({ where: { draftId: `${draft.id}-linkedin` }, include: { draft: true } });
        assert(step && step.status === FollowUpStatus.PENDING, 'a pending reminder exists');
        assert(step.draft.channel === 'LINKEDIN' && !step.draft.autoSend, 'it is a manual LinkedIn step');
        assert(step.content?.startsWith('[Stage 1] LinkedIn connection request\n\n'), 'Today shows it as the connection request');
        assert(step.dueDate.getTime() === start.getTime(), 'due when the first email goes out');

        // Re-scheduling replaces the reminder; once sent by hand it is never asked for again.
        await scheduleLinkedInConnectStep({ draft, firstStep: { subjectLine: draft.subjectLine, bodyContent: draft.bodyContent }, postId: draftPostId, dealId: null, start, senderName: owner.name, ownerId: owner.id });
        assert((await db.followUp.count({ where: { draftId: `${draft.id}-linkedin` } })) === 1, 're-scheduling does not duplicate the step');
        await db.followUp.updateMany({ where: { draftId: `${draft.id}-linkedin` }, data: { status: FollowUpStatus.SENT } });
        const repeat = await scheduleLinkedInConnectStep({ draft, firstStep: { subjectLine: draft.subjectLine, bodyContent: draft.bodyContent }, postId: draftPostId, dealId: null, start, senderName: owner.name, ownerId: owner.id });
        assert(!repeat, 'a request already sent is not scheduled again');

        const noProfile = await scheduleLinkedInConnectStep({ draft: { ...draft, id: `${draft.id}-nolink`, targetContactLinkedin: undefined }, postId: draftPostId, dealId: null, start, senderName: owner.name, ownerId: owner.id });
        assert(!noProfile, 'no LinkedIn profile, no LinkedIn step');
      });
    } finally {
      // Put everything back the way it was.
      await db.reEngagementEvent.deleteMany({ where: { newBuyingSignal: { contains: `bdos-test-${RUN}` } } });
      if (draftPostId) await db.linkedInPost.delete({ where: { id: draftPostId } }).catch(() => undefined);
      await db.linkedInPost.deleteMany({ where: { postUrl: { in: createdPostUrls } } });
      if (keywordId) await db.keyword.delete({ where: { id: keywordId } }).catch(() => undefined);
      for (const k of activeKeywords) {
        await db.keyword.update({ where: { id: k.id }, data: { lastSearchedAt: k.lastSearchedAt, matchesFound: k.matchesFound } }).catch(() => undefined);
      }
      await db.applicationSettings.deleteMany({ where: { key: { in: TOUCHED_SETTINGS } } });
      for (const row of savedSettings) {
        await db.applicationSettings.create({ data: { key: row.key, value: row.value } });
      }
    }
  }

  console.log(`\n LinkedIn tests: ${passed} passed, ${failed} failed\n`);
  await db.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect().catch(() => undefined);
  process.exit(1);
});
