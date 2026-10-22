import { setupTestEnvironment } from './setup';
import { db } from '../src/lib/db';
import { SettingsService } from '../src/lib/settings';
import { calculateBuyingReadiness, determinePriorityTier } from '../src/features/prioritization/scoring';
import { calculateAiOpportunityScore, generateRecommendedServices } from '../src/features/company360/scoring';
import { addLinkedInAccountAction, setPriorityTierAction } from '../src/features/prioritization/actions';
import { resolveLinkedInAccount, isRealDomain } from '../src/features/prioritization/linkedinAccount';
import type { Company360Profile } from '../src/features/company360/types';

/**
 * AI Priorities: every number and step comes from real evidence, nothing is filled in.
 * Run with: npx tsx tests/priorities-test.ts
 */

setupTestEnvironment();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(` ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(` ❌ FAIL: ${name}\n    ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

/** A Company 360 profile with only the fields the Priorities page reads. */
function profile(opts: {
  factors?: [string, number][];
  contacts?: { name: string; jobTitle: string; seniority?: string; linkedinUrl?: string }[];
  service?: boolean;
  linkedinPage?: string;
}): Company360Profile {
  const factors = (opts.factors || []).map(([factorName, impactScore]) => ({ factorName, impactScore, description: `${factorName} evidence` }));
  return {
    companyId: 'acme', domain: 'acme-test.io',
    overview: { companyName: 'Acme', industry: 'software', employeeCount: 120, linkedinPageUrl: opts.linkedinPage || '' },
    decisionMakers: (opts.contacts || []).map((c, i) => ({ id: `d${i}`, email: '', emailStatus: 'Unverified', department: 'Executive', source: 'Apollo', seniority: c.seniority || 'Director', linkedinUrl: c.linkedinUrl || '', name: c.name, jobTitle: c.jobTitle })),
    opportunityScoring: { overallScore: factors.reduce((n, f) => n + f.impactScore, 0), confidenceScorePercent: factors.length * 20, scoringFactors: factors },
    recommendedServices: opts.service ? [{ serviceName: 'React squad', reasoning: 'They use React.', estimatedEngagementInr: 'From ₹20,00,000', estimatedEngagementUsd: 'From $25,000', suggestedSquad: 'Fixed Price', fitScore: 70 }] : [],
  } as unknown as Company360Profile;
}

async function main() {
  await test('Tier bands match the labels (80 / 65 / 45 / 25)', () => {
    const cases: [number, string][] = [[100, 'IMMEDIATE'], [80, 'IMMEDIATE'], [79, 'HIGH'], [65, 'HIGH'], [64, 'MEDIUM'], [45, 'MEDIUM'], [44, 'MONITOR'], [25, 'MONITOR'], [24, 'ARCHIVE'], [0, 'ARCHIVE']];
    for (const [score, tier] of cases) assert(determinePriorityTier(score) === tier, `${score} -> ${determinePriorityTier(score)}, expected ${tier}`);
  });

  await test('The score is exactly the sum of the signals shown', () => {
    const a = calculateBuyingReadiness(profile({ factors: [['Company profile', 20], ['Funding', 20], ['Known tech stack', 16]] }));
    assert(a.buyingReadinessScore === 56 && a.keySignals.reduce((n, s) => n + s.impactScore, 0) === 56, 'signals add up to the score');
    assert(a.dataCoveragePercent === 60, 'coverage is the share of evidence found');
  });

  await test('No contact found: nobody is invented, the step is to find one', () => {
    const a = calculateBuyingReadiness(profile({ factors: [['Company profile', 20], ['Funding', 20], ['Known tech stack', 20], ['Hiring', 20]] }));
    assert(!a.primaryContact, 'no contact');
    const text = JSON.stringify(a.nextBestActions) + a.recommendedPitch;
    assert(!/\bCTO\b/.test(text), 'no made-up CTO');
    assert(a.nextBestActions.some((x) => x.actionType === 'FIND_CONTACT'), 'asks to find a decision maker');
    assert(!a.nextBestActions.some((x) => x.actionType === 'LINKEDIN_CONNECT'), 'no LinkedIn step without a profile or page');
  });

  await test('A known contact and service drive the steps; masked surnames are readable', () => {
    const a = calculateBuyingReadiness(profile({
      factors: [['Company profile', 20], ['Decision makers found', 20], ['Known tech stack', 20], ['Funding', 20]],
      contacts: [{ name: 'Priya Sh***a', jobTitle: 'Director Eng' }, { name: 'Rahul Me***a', jobTitle: 'CTO', seniority: 'C-Level', linkedinUrl: 'https://www.linkedin.com/in/rahul' }],
      service: true,
    }));
    assert(a.priorityTier === 'IMMEDIATE', 'score 80 is Immediate');
    assert(a.primaryContact?.name === 'Rahul M.' && a.primaryContact.jobTitle === 'CTO', `most senior contact, readable (${a.primaryContact?.name})`);
    assert(a.matchedService?.fromInr === 'From ₹20,00,000', 'catalog starting price, not a forecast');
    const connect = a.nextBestActions.find((x) => x.actionType === 'LINKEDIN_CONNECT');
    assert(connect?.targetUrl === 'https://www.linkedin.com/in/rahul', 'connect links to the real profile');
    assert(a.nextBestActions.every((x) => x.executionPriority === 'Urgent Today'), 'urgency follows the tier');
  });

  await test('Already in the CRM: continue the deal, never "add to pipeline" again', () => {
    const a = calculateBuyingReadiness(profile({ factors: [['Company profile', 20], ['Funding', 20], ['Hiring', 20]], contacts: [{ name: 'Anita Rao', jobTitle: 'CEO' }] }), {
      inCrm: { dealId: 'deal-1', companyName: 'Acme', stage: 'LEAD', ownerName: 'Khush', mine: false },
    });
    assert(a.nextBestActions[0].actionType === 'OPEN_DEAL' && a.nextBestActions[0].targetUrl === '/crm?deal=deal-1', 'first step opens the deal');
    assert(!a.nextBestActions.some((x) => x.actionType === 'ADD_TO_CRM'), 'no duplicate deal suggested');
  });

  await test('A manual tier is shown, and the score’s own tier is kept', () => {
    const a = calculateBuyingReadiness(profile({ factors: [['Company profile', 12]] }), { override: { tier: 'HIGH', setBy: 'Amit', setAt: new Date().toISOString() } });
    assert(a.priorityTier === 'HIGH' && a.scoredTier === 'ARCHIVE', 'override shown, score tier kept');
  });

  await test('Low scores only suggest checking again, no outreach', () => {
    const a = calculateBuyingReadiness(profile({ factors: [['Company profile', 12], ['Decision makers found', 20]], contacts: [{ name: 'Dennis Wo***e', jobTitle: 'CEO' }] }));
    assert(a.priorityTier === 'MONITOR', 'score 32 is Monitor');
    assert(a.nextBestActions.length === 1 && a.nextBestActions[0].actionType === 'MONITOR_ACTIVITY', 'only "check again later"');
  });

  // ---- Company fit score (company360/scoring.ts): five evidence parts of up to 20 points ----
  const fit = (o: {
    employees?: number; industry?: string; keywords?: string[]; titles?: string[]; growth12?: number; jobs?: number;
    stack?: string[]; funding?: { name: string; date: string }; enrichedAt?: string;
  }) => calculateAiOpportunityScore(
    { companyName: 'X', industry: o.industry || 'information technology & services', employeeCount: o.employees || 0 } as Parameters<typeof calculateAiOpportunityScore>[0],
    { primaryLanguages: o.stack || [] } as unknown as Parameters<typeof calculateAiOpportunityScore>[1],
    (o.titles || []).map((t, i) => ({ id: `d${i}`, name: `Person ${i}`, jobTitle: t })) as Parameters<typeof calculateAiOpportunityScore>[2],
    o.funding ? ({ latestRoundName: o.funding.name, latestRoundDate: o.funding.date } as Parameters<typeof calculateAiOpportunityScore>[3]) : undefined,
    undefined, undefined,
    o.jobs ? ({ activeJobOpeningsCount: o.jobs } as Parameters<typeof calculateAiOpportunityScore>[6]) : undefined,
    { signals: { keywords: o.keywords, headcountGrowth12m: o.growth12, enrichedAt: o.enrichedAt }, catalog: [{ id: 's', name: 'Web squad', minUsd: '', minInr: '', stack: 'React, Node.js, AWS', model: 'Fixed' }] },
  );
  const part = (r: ReturnType<typeof fit>, name: string) => r.scoringFactors.find((f) => f.factorName === name)?.impactScore;

  await test('Fit score: Lev-like company (150 people, CEO, fintech) is scored from real signals', () => {
    const r = fit({ employees: 150, keywords: ['fintech', 'startup', 'software development'], titles: ['Founder & CEO', 'VP Sales'] });
    assert(part(r, 'Company size') === 20 && part(r, 'Right person found') === 18 && part(r, 'Service fit') === 12, JSON.stringify(r.scoringFactors)); // fintech fits the catalog's web service
    assert(r.overallScore === 50, `score 50 (${r.overallScore})`);
    // Coverage: size, what they do and senior people known; no tech leader, growth, jobs, stack or funding.
    assert(r.confidenceScorePercent === 38 && r.evidence?.filter((e) => e.known).length === 3, `3 of 8 facts (${r.confidenceScorePercent}%)`);
    const cto = fit({ employees: 150, keywords: ['fintech'], titles: ['CTO'] });
    assert(cto.confidenceScorePercent === 50, `a CTO found is one more known fact (${cto.confidenceScorePercent}%)`);
  });

  await test('Fit score: the right person matters (CTO 20, founder of a big company 12, other roles 6)', () => {
    assert(part(fit({ employees: 500, titles: ['Chief Sustainability Officer', 'CTO'] }), 'Right person found') === 20, 'CTO found');
    assert(part(fit({ employees: 5000, titles: ['CEO'] }), 'Right person found') === 12, 'founder of a big company');
    assert(part(fit({ employees: 183000, titles: ['Chief Sustainability Officer'] }), 'Right person found') === 6, 'only an unrelated senior role');
  });

  await test('Fit score: IT services firms are competitors, product companies with "IT service management" are not', () => {
    assert(part(fit({ keywords: ['it solutions & services', 'consulting', 'business process outsourcing'] }), 'Service fit') === 0, 'Infosys-like scores 0');
    assert(part(fit({ keywords: ['it service management', 'freshdesk', 'ai agents'] }), 'Service fit') === 10, 'Freshworks-like is a product company');
  });

  await test('Fit score: tech stack, funding and growth raise it; a top prospect reaches Immediate', () => {
    const recent = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const r = fit({ employees: 120, titles: ['CTO'], growth12: 0.25, stack: ['React', 'Node.js', 'Python'], funding: { name: 'Series A', date: recent }, enrichedAt: new Date().toISOString() });
    assert(r.overallScore === 100 && determinePriorityTier(r.overallScore) === 'IMMEDIATE', `top prospect (${r.overallScore})`);
    const none = fit({ employees: 120, titles: ['CTO'], enrichedAt: new Date().toISOString(), keywords: ['saas'] });
    assert(part(none, 'Funding') === 0 && /No funding round/.test(none.scoringFactors.find((f) => f.factorName === 'Funding')!.description), 'checked, no funding: shown as +0');
    assert(part(fit({ employees: 120, growth12: -0.1 }), 'Growth') === 0, 'shrinking headcount adds nothing');
  });

  await test('Services: without a tech stack, what the company does picks the right catalog service', () => {
    const catalog = [
      { id: '2', name: 'Native & Cross-Platform Mobile Applications', minUsd: '', minInr: '', stack: 'Flutter, Swift', model: 'Team' },
      { id: '3', name: 'Modern Web Architecture & Web Platforms', minUsd: '', minInr: '', stack: 'React, Node.js', model: 'Team' },
      { id: '4', name: 'Enterprise Backend, Cloud & DevOps Infrastructure', minUsd: '', minInr: '', stack: 'AWS, Docker', model: 'Fixed' },
      { id: '5', name: 'E-Commerce Platforms & Headless Digital Retail', minUsd: '', minInr: '', stack: 'Shopify', model: 'Fixed' },
    ];
    const pick = (keywords: string[], stack: string[] = []) => generateRecommendedServices({ primaryLanguages: stack } as unknown as Parameters<typeof generateRecommendedServices>[0], catalog, { keywords })[0];
    assert(pick(['fintech', 'startup', 'software development'])?.serviceName.startsWith('Modern Web'), 'Lev-like: web platforms (not "Cross-Platform" mobile)');
    assert(pick(['search', 'mobile', 'android', 'apps'])?.serviceName.startsWith('Native & Cross-Platform Mobile'), 'Google-like: mobile apps');
    assert(pick(['retail', 'supermarket chain', 'shopping mall management'])?.serviceName.startsWith('E-Commerce'), 'retailer: e-commerce');
    assert(pick(['telecommunications', 'fiber network expansion'])?.serviceName.startsWith('Enterprise Backend'), 'telecom: backend & cloud');
    assert(!pick(['it solutions & services', 'business process outsourcing']), 'IT services firm: no service');
    const tech = pick(['retail'], ['React', 'Node.js']);
    assert(tech?.matchedBy === 'tech' && tech.serviceName.startsWith('Modern Web'), 'a tech stack match wins over what they do');
    assert(pick(['retail'])?.matchedBy === 'focus', 'keyword matches are marked as likely');
  });

  const dbOnline = await db.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  if (!dbOnline) {
    console.log(' ⚠️  Database not reachable: skipping the saved-tier test.');
  } else {
    const before = await SettingsService.get('priority_tier_overrides', '');
    try {
      await test('A manual tier is saved for the team and can be reset', async () => {
        const saved = await setPriorityTierAction('https://www.Prio-Test-Co.io/about', 'HIGH');
        assert(!saved.error && saved.override?.tier === 'HIGH', `saved (${saved.error})`);
        const stored = JSON.parse(await SettingsService.get('priority_tier_overrides', '{}'));
        assert(stored['prio-test-co.io']?.tier === 'HIGH', 'stored under the clean domain');
        await setPriorityTierAction('prio-test-co.io', null);
        assert(!JSON.parse(await SettingsService.get('priority_tier_overrides', '{}'))['prio-test-co.io'], 'reset removes it');
        assert((await setPriorityTierAction('linkedin.com', 'HIGH')).error, 'platform domains are not accounts');
      });
    } finally {
      await SettingsService.set('priority_tier_overrides', before || '{}');
    }
  }

  await test('resolveLinkedInAccount validates inputs and rejects platform domains', async () => {
    assert(!isRealDomain('linkedin.com'), 'linkedin.com is a platform domain');
    assert(!isRealDomain('lnkd.in'), 'lnkd.in is a platform domain');
    assert(isRealDomain('stripe.com'), 'stripe.com is a real company domain');
    const empty = await resolveLinkedInAccount('');
    assert(empty.error === 'Paste a LinkedIn URL first.', 'empty input reports error');
    const invalid = await resolveLinkedInAccount('invalid-url-xyz');
    assert(Boolean(invalid.error), 'invalid url reports error');
  });

  await test('addLinkedInAccountAction validates empty input', async () => {
    const res = await addLinkedInAccountAction('');
    assert(res.error === 'Paste a LinkedIn URL first.', 'empty url rejected');
  });

  console.log(`\n Priorities tests: ${passed} passed, ${failed} failed\n`);
  await db.$disconnect();
  process.exit(failed ? 1 : 0);
}

main();
