import { setupTestEnvironment } from './setup';
import { db } from '../src/lib/db';
import {
  buildSalesNavBookmarklet,
  decodeBookmarkPayload,
  parseSalesNavInput,
  salesNavPeopleSearchUrl,
} from '../src/features/linkedin/salesnav';
import { importSalesNavLeads, SALESNAV_IMPORT_TITLE } from '../src/features/linkedin/salesnavImport';

/**
 * Sales Navigator bridge tests: pasted lists, the bookmark hand-over, the bookmark itself (run on
 * a simulated Sales Navigator page), and importing into the CRM. Apify is simulated, so no real
 * token or credit is used, and every CRM row created is removed afterwards.
 *
 * Run with: npx tsx tests/salesnav-test.ts
 */

setupTestEnvironment();
process.env.LINKEDIN_SCRAPER_API_KEY = 'apify_api_TESTTOKEN123';

const RUN = Date.now().toString(36);
const COMPANY = `SalesNav Test Co ${RUN}`;
const PROFILE = `https://www.linkedin.com/in/kavya-nair-${RUN}`;
const LEAD_PAGE = `https://www.linkedin.com/sales/lead/ACwAAB${RUN},NAME_SEARCH,abc`;

// Simulated Apify: the profile scraper knows one person.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!url.includes('api.apify.com')) return realFetch(input, init);
  const body = JSON.parse(String(init?.body || '{}')) as { queries?: string[] };
  const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (url.includes('linkedin-profile-scraper') && body.queries?.[0] === PROFILE) {
    return json([{ linkedinUrl: PROFILE, firstName: 'Kavya', lastName: 'Nair', headline: 'VP Engineering', currentPosition: [{ position: 'VP Engineering', companyName: COMPANY }] }]);
  }
  return json([]);
}) as typeof fetch;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(` ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(` ❌ FAIL: ${name}\n    ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

/** Runs the bookmark on a pretend LinkedIn page and returns what it would send to the CRM. */
function runBookmark(page: { path: string; single?: Record<string, string>; list?: { href: string; name: string; title?: string; company?: string }[] }) {
  const code = decodeURIComponent(buildSalesNavBookmarklet('https://crm.example.com').slice('javascript:'.length));
  const el = (text?: string) => (text === undefined ? null : { innerText: text });
  const rowEl = (r: { href: string; name: string; title?: string; company?: string }) => ({
    querySelector: (sel: string) =>
      el(sel.includes('person-name') ? r.name : sel.includes('"title"') || sel.includes('job-title') ? r.title : sel.includes('company-name') ? r.company : undefined),
  });
  const links = (page.list || []).map((r) => ({ href: `${r.href}?trk=x`, innerText: r.name, closest: () => rowEl(r), parentElement: rowEl(r) }));
  let opened = '';
  let alerted = '';
  const document = {
    querySelector: (sel: string) => {
      const match = Object.entries(page.single || {}).find(([key]) => sel.includes(key));
      return el(match?.[1]);
    },
    querySelectorAll: () => links,
  };
  const location = { pathname: page.path, href: `https://www.linkedin.com${page.path}?trk=abc` };
  new Function('document', 'location', 'window', 'alert', code)(document, location, { open: (u: string) => { opened = u; } }, (m: string) => { alerted = m; });
  const payload = opened ? new URL(opened).searchParams.get('leads') || '' : '';
  return { opened, alerted, leads: payload ? decodeBookmarkPayload(payload) : [] };
}

async function main() {
  await test('Pasted lists: URLs, comma and tab rows, Sales Navigator links', () => {
    const leads = parseSalesNavInput([
      'https://www.linkedin.com/in/riya-shah-4a1b2c?utm_source=share',
      'Amit Patel, CTO, Acme Health, https://www.linkedin.com/in/amit-patel',
      'Neha Iyer\tHead of Product\tGlobex\thttps://www.linkedin.com/sales/lead/ACwAAA123,NAME_SEARCH,xyz?_ntb=1',
      '',
      'Just A Name',
    ].join('\n'));
    assert(leads.length === 4, `4 leads read (got ${leads.length})`);
    assert(leads[0].name === 'Riya Shah' && leads[0].url === 'https://www.linkedin.com/in/riya-shah-4a1b2c', 'name guessed from the profile URL, tracking removed');
    assert(leads[1].title === 'CTO' && leads[1].company === 'Acme Health', 'comma row split into name, title, company');
    assert(leads[2].company === 'Globex' && leads[2].url === 'https://www.linkedin.com/sales/lead/ACwAAA123,NAME_SEARCH,xyz', 'tab row with a Sales Navigator lead link');
    assert(leads[3].name === 'Just A Name' && !leads[3].url, 'a name on its own is kept');
  });

  await test('Bookmark hand-over is decoded safely', () => {
    const payload = Buffer.from(JSON.stringify([{ name: 'Riya  Shah', title: 'CTO', company: 'Acme', url: 'https://www.linkedin.com/in/riya?x=1' }, { foo: 1 }, null])).toString('base64');
    const leads = decodeBookmarkPayload(payload);
    assert(leads.length === 1 && leads[0].name === 'Riya Shah' && leads[0].url === 'https://www.linkedin.com/in/riya', 'valid lead kept and cleaned; junk dropped');
    assert(decodeBookmarkPayload('not base64 !!').length === 0, 'garbage gives no leads');
    assert(decodeBookmarkPayload(Buffer.from('{"a":1}').toString('base64')).length === 0, 'a non-list gives no leads');
  });

  await test('The bookmark sends the lead open in Sales Navigator', () => {
    const res = runBookmark({
      path: '/sales/lead/ACwAAB123,NAME_SEARCH,abc',
      single: { 'person-name': 'Kavya Nair', headline: 'VP Engineering at Globex', 'company-name': 'Globex' },
    });
    assert(res.opened.startsWith('https://crm.example.com/linkedin/sales-navigator?leads='), 'opens the CRM import page');
    assert(res.leads.length === 1, 'one lead');
    assert(res.leads[0].name === 'Kavya Nair' && res.leads[0].company === 'Globex' && res.leads[0].title === 'VP Engineering at Globex', 'name, title and company read from the page');
    assert(res.leads[0].url === 'https://www.linkedin.com/sales/lead/ACwAAB123,NAME_SEARCH,abc', 'lead page link without tracking');
  });

  await test('The bookmark sends every lead on a list or search page, once each', () => {
    const res = runBookmark({
      path: '/sales/lists/people/123',
      list: [
        { href: 'https://www.linkedin.com/sales/lead/A1,NAME,x', name: 'Riya Shah', title: 'CTO', company: 'Acme' },
        { href: 'https://www.linkedin.com/sales/lead/A1,NAME,x', name: 'Riya Shah', title: 'CTO', company: 'Acme' },
        { href: 'https://www.linkedin.com/sales/lead/B2,NAME,y', name: 'Amit Patel', title: 'Founder', company: 'Globex' },
      ],
    });
    assert(res.leads.length === 2, `two distinct leads (got ${res.leads.length})`);
    assert(res.leads[1].name === 'Amit Patel' && res.leads[1].company === 'Globex', 'each row\'s details kept');
  });

  await test('The bookmark explains itself on a page with no lead', () => {
    const res = runBookmark({ path: '/feed/', list: [] });
    assert(!res.opened && /No Sales Navigator lead/.test(res.alerted), 'shows a message instead of opening the CRM');
  });

  await test('Contacts link to a Sales Navigator search', () => {
    assert(salesNavPeopleSearchUrl('Riya Shah', 'Acme (independent)') === 'https://www.linkedin.com/sales/search/people?keywords=Riya%20Shah%20Acme', 'search for name and company');
  });

  const dbOnline = await db.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  if (!dbOnline) {
    console.log(' ⚠️  Database not reachable: skipping the CRM import tests.');
  } else {
    const user = await db.user.findFirst({ select: { id: true } });
    try {
      await test('Importing creates the deal, keeps the Sales Navigator link, and does not duplicate', async () => {
        assert(user, 'a user exists to own the deal');
        const first = await importSalesNavLeads(user, [
          { name: 'Riya Shah', title: 'CTO', company: COMPANY, url: LEAD_PAGE },
          { name: '', company: COMPANY },
        ]);
        assert(first.rows[0].status === 'created' && first.created === 1, `new deal created (${first.rows[0].status})`);
        assert(first.rows[1].status === 'error', 'a lead without a name is reported, not imported');

        const deal = await db.deal.findUnique({ where: { id: first.rows[0].dealId! }, include: { primaryContact: true } });
        assert(deal?.ownerId === user.id && deal.source === 'LINKEDIN_PEOPLE', 'deal owned by the importer');
        assert(deal.primaryContact?.name === 'Riya Shah' && deal.primaryContact.title === 'CTO', 'contact saved');
        const link = await db.crmActivity.findFirst({ where: { dealId: deal.id, contactId: deal.primaryContact!.id, title: { startsWith: SALESNAV_IMPORT_TITLE } } });
        assert(link?.details === LEAD_PAGE && link.type === 'LINKEDIN', 'Sales Navigator lead page saved on the contact');

        const again = await importSalesNavLeads(user, [{ name: 'riya shah', title: 'CTO', company: COMPANY, url: LEAD_PAGE }]);
        assert(again.rows[0].status === 'added' && again.rows[0].dealId === deal.id, 're-import joins the same deal');
        const contacts = await db.contact.count({ where: { companyId: deal.companyId, name: { equals: 'Riya Shah', mode: 'insensitive' } } });
        assert(contacts === 1, 'no duplicate contact');
      });

      await test('Missing details are filled from the public profile when asked', async () => {
        assert(user, 'a user exists');
        const res = await importSalesNavLeads(user, [{ name: '', url: PROFILE }], { enrich: true });
        assert(res.rows[0].status !== 'error', `imported (${res.rows[0].message})`);
        const contact = await db.contact.findFirst({ where: { linkedinUrl: PROFILE } });
        assert(contact?.name === 'Kavya Nair' && contact.title === 'VP Engineering', 'name and title read from LinkedIn');
        assert(res.rows[0].company === COMPANY, 'company read from LinkedIn');
      });
    } finally {
      await db.company.deleteMany({ where: { name: { in: [COMPANY, `Kavya Nair (independent)`] } } });
    }
  }

  console.log(`\n Sales Navigator tests: ${passed} passed, ${failed} failed\n`);
  await db.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect().catch(() => undefined);
  process.exit(1);
});
