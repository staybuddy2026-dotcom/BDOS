import { setupTestEnvironment } from './setup';
import { db } from '../src/lib/db';
import { SettingsService } from '../src/lib/settings';
import { enrichApolloPersonDirect, enrichPostWithApollo } from '../src/features/apollo/actions';
import { enrichDiscoveryLeadContactAction } from '../src/features/discovery/actions';
import type { DiscoveryLeadItem } from '../src/features/discovery/types';

/**
 * Apollo credit safety: credits are only spent when there is something new to reveal, and only
 * for the extras (personal email, phone) that Settings allows. Apollo is simulated and every
 * paid call is counted; no real key or credit is used, and every row the test creates is removed.
 *
 * Run with: npx tsx tests/apollo-credit-test.ts
 */

setupTestEnvironment();
process.env.APOLLO_MOCK_MODE = 'false';
process.env.APOLLO_API_KEY = 'apollo-test-key-123';

const RUN = Date.now().toString(36);
const DOMAIN = `bdos-credit-${RUN}.io`;
const matchCalls: Record<string, unknown>[] = [];
const realFetch = globalThis.fetch;

// --- Simulated Apollo API ------------------------------------------------------
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!url.includes('api.apollo.io')) return realFetch(input, init);
  const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
  if (url.includes('/people/match')) {
    matchCalls.push(body);
    return json({
      person: {
        id: String(body.id || `ap-${RUN}`), first_name: String(body.first_name || 'Riya'), last_name: 'Shah', title: 'CTO',
        email: `riya@${DOMAIN}`, organization: { id: `org-${RUN}`, name: 'Credit Test Co', primary_domain: DOMAIN },
      },
    });
  }
  return json({ people: [], organizations: [] });
}) as typeof fetch;

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

async function main() {
  const dbOnline = await db.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  if (!dbOnline) {
    console.log(' ⚠️  Database not reachable: skipping the Apollo credit tests.');
    return;
  }
  if ((await SettingsService.get('apolloEnabled', 'true')) !== 'true') {
    console.log(' ⚠️  Apollo is turned off in Settings: skipping the Apollo credit tests.');
    return;
  }

  const post = await db.linkedInPost.create({
    data: { postUrl: `https://www.linkedin.com/posts/bdos-credit-${RUN}`, authorName: 'Riya Shah', companyName: DOMAIN, postPreview: 'Looking for a dev partner', matchedKeyword: 'test' },
  });
  const company = await db.company.create({ data: { name: 'Credit Test Co', domain: DOMAIN } });
  await db.contact.create({ data: { companyId: company.id, name: 'Known Person', email: `known@${DOMAIN}`, apolloPersonId: `known-${RUN}` } });

  try {
    await test('Enriching a post costs one credit, and enriching it again costs none', async () => {
      const first = await enrichPostWithApollo(post.id, { workEmail: true });
      assert(first.workEmail === `riya@${DOMAIN}`, `work email saved (${first.workEmail})`);
      assert(matchCalls.length === 1, `one people/match call, not ${matchCalls.length}`);
      await enrichPostWithApollo(post.id, { workEmail: true });
      assert(matchCalls.length === 1, `already enriched: no new call (calls: ${matchCalls.length})`);
    });

    await test('A person already in the CRM with an email is not paid for again', async () => {
      const before = matchCalls.length;
      const res = await enrichApolloPersonDirect({ apolloPersonId: `known-${RUN}`, personName: 'Known Person', organizationDomain: DOMAIN });
      assert(res.person?.workEmail === `known@${DOMAIN}` && res.person.creditsUsed === 0, 'saved email returned');
      assert(matchCalls.length === before, 'no people/match call');
    });

    await test('Discovery unlock only asks for personal email and phone when Settings allow it', async () => {
      const [allowPersonal, allowPhone] = await Promise.all([
        SettingsService.get('apolloAllowPersonalEmail', 'false'),
        SettingsService.get('apolloAllowPhone', 'false'),
      ]);
      const before = matchCalls.length;
      await enrichDiscoveryLeadContactAction({ companyId: `apollo_live_disc-${RUN}`, companyName: 'Credit Test Co', domain: DOMAIN, recommendedContactName: 'Riya S.' } as DiscoveryLeadItem);
      assert(matchCalls.length === before + 1, 'one people/match call');
      const body = matchCalls[matchCalls.length - 1];
      assert(!!body.reveal_personal_emails === (allowPersonal === 'true'), `personal email reveal follows Settings (${allowPersonal})`);
      assert(!body.reveal_phone_number || allowPhone === 'true', `phone reveal follows Settings (${allowPhone})`);
    });
  } finally {
    await db.activityLog.deleteMany({ where: { entityId: { contains: RUN } } }).catch(() => undefined);
    await db.apolloEnrichment.deleteMany({ where: { linkedPostId: post.id } }).catch(() => undefined);
    await db.linkedInPost.delete({ where: { id: post.id } }).catch(() => undefined);
    await db.company.delete({ where: { id: company.id } }).catch(() => undefined);
  }
}

main()
  .catch((err) => {
    console.error(err);
    failed++;
  })
  .finally(async () => {
    console.log(`\n Apollo credit tests: ${passed} passed, ${failed} failed\n`);
    await db.$disconnect();
    process.exit(failed ? 1 : 0);
  });
