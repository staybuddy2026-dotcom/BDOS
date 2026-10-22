import { setupTestEnvironment } from './setup';
import { db } from '../src/lib/db';
import { SettingsService } from '../src/lib/settings';

/**
 * Apollo Search: filters Apollo really applies, honest handling of paid-plan filters, and company
 * names matched to the real company. Apollo is simulated and every request body is recorded.
 *
 * Run with: npx tsx tests/apollo-search-test.ts
 */

setupTestEnvironment();
process.env.APOLLO_MOCK_MODE = 'false';
process.env.APOLLO_API_KEY = 'apollo-search-test-key';

let planHasAdvanced = false;
const sent: { endpoint: string; body: Record<string, unknown> }[] = [];
const realFetch = globalThis.fetch;
const ADVANCED = ['currently_using_any_of_technology_uids', 'q_organization_job_titles', 'latest_funding_date_range'];

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!url.includes('api.apollo.io')) return realFetch(input, init);
  const endpoint = url.split('/api/v1/')[1].split('?')[0];
  const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
  sent.push({ endpoint, body });
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const advanced = ADVANCED.find((k) => body[k] !== undefined);
  if (advanced && !planHasAdvanced) {
    return json({ error: `Cannot access advanced filters ${advanced} on free plan. Please start a trial or upgrade.` }, 422);
  }
  if (endpoint === 'organizations/search') {
    if (body.q_organization_name === 'Acme Health') {
      return json({ organizations: [{ id: 'org-other', name: 'Acme Healthcare Group', primary_domain: 'acmehcg.com' }, { id: 'org-acme', name: 'Acme Health', primary_domain: 'acmehealth.io' }], pagination: { total_entries: 2 } });
    }
    if (body.q_organization_name) return json({ organizations: [], pagination: { total_entries: 0 } });
    return json({ organizations: [{ id: 'o1', name: 'SaaSCo', primary_domain: 'saasco.io', estimated_num_employees: 80 }], pagination: { total_entries: 1 } });
  }
  if (endpoint === 'mixed_people/api_search') {
    return json({ people: [{ id: 'p1', first_name: 'Riya', last_name_obfuscated: 'Sh***h', title: 'CTO', has_email: true, organization: { name: 'Acme Health' } }], total_entries: 1 });
  }
  return json({});
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
    console.log(' ⚠️  Database not reachable: skipping the Apollo search tests (the plan check is stored there).');
    return;
  }
  const savedPlan = await SettingsService.get('apollo_advanced_filters', 'null');
  const { apolloProvider, getAdvancedFiltersAvailable, resetApolloKeyCache } = await import('../src/features/apollo/provider');

  try {
    await test('The plan check runs once and is remembered', async () => {
      await resetApolloKeyCache();
      sent.length = 0;
      assert((await getAdvancedFiltersAvailable()) === false, 'free plan detected');
      assert((await getAdvancedFiltersAvailable()) === false, 'still false');
      assert(sent.length === 1, `one check call, not ${sent.length}`);
    });

    await test('Paid-plan filters are refused clearly, without spending an Apollo call', async () => {
      sent.length = 0;
      const people = await apolloProvider.searchPeopleAdvanced({ jobTitle: 'CTO', techUsage: 'React' });
      assert(people.error?.code === 'PLAN_RESTRICTED' && /Technology needs a paid Apollo plan/.test(people.error.message), `clear message (${people.error?.message})`);
      const orgs = await apolloProvider.searchOrganizationsAdvanced({ keywords: 'saas', hiringKeywords: 'React Developer', fundingPresetDays: 90 });
      assert(orgs.error?.code === 'PLAN_RESTRICTED' && /Hiring for roles, Funding date need a paid/.test(orgs.error.message), `names both filters (${orgs.error?.message})`);
      assert(sent.length === 0, `no Apollo calls (${sent.length})`);
    });

    await test('A company name finds people at that company, not people who mention it', async () => {
      sent.length = 0;
      const res = await apolloProvider.searchPeopleAdvanced({ companyName: 'Acme Health', jobTitle: 'CTO' });
      const search = sent.find((x) => x.endpoint === 'mixed_people/api_search')!.body;
      assert(JSON.stringify(search.organization_ids) === '["org-acme"]', `exact name match wins (${JSON.stringify(search.organization_ids)})`);
      assert(!String(search.q_keywords || '').includes('Acme'), 'company name is not a keyword');
      assert(res.note === 'People at Acme Health (acmehealth.io)', `note shown (${res.note})`);
      assert(res.people[0]?.hasEmailAvailable === true, 'email-on-file flag kept');
    });

    await test('An unknown company name says so instead of returning other people', async () => {
      sent.length = 0;
      const res = await apolloProvider.searchPeopleAdvanced({ companyName: 'Nope Industries' });
      assert(res.people.length === 0 && /no company named "Nope Industries"/.test(res.note || ''), `explained (${res.note})`);
      assert(!sent.some((x) => x.endpoint === 'mixed_people/api_search'), 'no people search spent');
    });

    await test('On a paid plan, hiring is a real job-posting filter (not a keyword)', async () => {
      planHasAdvanced = true;
      await resetApolloKeyCache();
      sent.length = 0;
      await apolloProvider.searchPeopleAdvanced({ jobTitle: 'CTO', hiringActivity: 'React Developer, DevOps Engineer' });
      const search = sent.find((x) => x.endpoint === 'mixed_people/api_search')!.body;
      assert(JSON.stringify(search.q_organization_job_titles) === '["React Developer","DevOps Engineer"]', 'job titles sent');
      assert(search.q_keywords === undefined, 'nothing added to the keyword search');
    });

    await test('No made-up funding-stage filter is ever sent', async () => {
      sent.length = 0;
      await apolloProvider.searchOrganizationsAdvanced({ keywords: 'saas', fundingPresetDays: 180 } as Parameters<typeof apolloProvider.searchOrganizationsAdvanced>[0]);
      const body = sent.find((x) => x.endpoint === 'organizations/search')!.body;
      assert(!('latest_funding_stage_cd' in body), 'no funding stage field');
      assert(!!body.latest_funding_date_range, 'funding date window sent on a paid plan');
    });
  } finally {
    await SettingsService.set('apollo_advanced_filters', savedPlan);
  }
}

main()
  .catch((err) => {
    console.error(err);
    failed++;
  })
  .finally(async () => {
    console.log(`\n Apollo search tests: ${passed} passed, ${failed} failed\n`);
    await db.$disconnect();
    process.exit(failed ? 1 : 0);
  });
