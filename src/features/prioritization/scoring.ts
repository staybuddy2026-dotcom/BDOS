import { Company360Profile } from '../company360/types';
import type { CrmMatch } from '../crm/types';
import { matchServicesByFocus, type CatalogService } from '../company360/scoring';
import { sameTech } from '@/lib/techMatch';
import { AccountBuyingSignal, BuyingReadinessDetails, DataSource, LinkedInAccountEvidence, PriorityTier, TIER_BANDS, TierOverride } from './types';
import { generateNextBestActions } from './recommendations';

/**
 * Priority tiers for the combined fit score (Apollo company fit + LinkedIn evidence). A company only scores
 * high when several real signals were found, so the bands sit lower than a guessed score would.
 *
 * 80+    Immediate (contact today)
 * 65-79  High (contact within 24 hours)
 * 45-64  Medium (add to an outreach sequence)
 * 25-44  Monitor (watch for new signals)
 * <25    Archive
 */
export function determinePriorityTier(score: number): PriorityTier {
  const tiers: PriorityTier[] = ['IMMEDIATE', 'HIGH', 'MEDIUM', 'MONITOR'];
  return tiers.find((t) => score >= TIER_BANDS[t].min) || 'ARCHIVE';
}

/**
 * The combined score: Apollo's company fit counts for 70 points, LinkedIn evidence for 30. A post saying
 * they need what we sell is the strongest buying signal there is, so it can move a company up a tier; a
 * company with no LinkedIn evidence can still reach High on Apollo fit alone.
 */
export const APOLLO_MAX_POINTS = 70;
export const LINKEDIN_MAX_POINTS = 30;

const SENIORITY_RANK: Record<string, number> = { 'C-Level': 0, VP: 1, Director: 2, Lead: 3, Manager: 4 };
// Who decides on development work: a technology leader, else the founder / CEO, else other senior people.
const TECH_LEADER = /\b(cto|chief technology|chief technical|vp,? (of )?(engineering|technology|product)|vice president,? (of )?(engineering|technology|product)|head of (engineering|technology|product|development|software)|director of (engineering|technology|software)|engineering director|chief product|cpo|cio|chief information)\b/i;
// "Owner" only as the business owner, not a job title such as "Product Owner" or "Process Owner".
const FOUNDER = /\b(founder|co-?founder|ceo|chief executive|managing director)\b|^\s*(business |company )?owner\b|(&|\/|,|\band) *owner\b/i;
const relevance = (title = '') => (TECH_LEADER.test(title) ? 0 : FOUNDER.test(title) ? 1 : 2);

/** Apollo masks surnames until a contact is revealed ("Dennis Wo***e"); show "Dennis W." instead. */
const readableName = (name: string) => name.replace(/\s+([A-Za-z])[A-Za-z]*\*+[A-Za-z]*/g, ' $1.').trim();
const nameKey = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');

/**
 * LinkedIn people search for someone whose profile URL is unknown. Apollo's free search masks surnames
 * ("Dennis W."); then it searches by first name, company and title, otherwise by full name.
 */
const linkedinSearchUrl = (name: string, company: string, title?: string) => {
  // A full name when Apollo gave one; the first name when the surname is masked ('Dennis W.').
  const who = /\s[A-Za-z]\.$/.test(name) ? name.split(/\s+/)[0] : name;
  const words = [who, company, (title || '').split(/[,|(-]/)[0].trim()].filter(Boolean).join(' ');
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(words)}`;
};

const DAY_MS = 86400000;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * LinkedIn part of the score (up to 30 points), from evidence only:
 *  - a post about needing what we sell: the AI's buying-intent score of the strongest post (up to 18; 8 when
 *    the post is not scored yet), +6 when the latest post is under 30 days old (+3 under 90), +2 for more than one;
 *  - a person found on LinkedIn: +4 for a technology leader or founder, +2 for anyone else.
 */
function scoreLinkedIn(evidence: LinkedInAccountEvidence | undefined, companyId: string, now: Date): { points: number; signals: AccountBuyingSignal[] } {
  const signals: AccountBuyingSignal[] = [];
  if (!evidence) return { points: 0, signals };
  const today = now.toISOString().split('T')[0];
  const add = (title: string, description: string, impactScore: number, detectedDate = today) =>
    signals.push({ id: `li_${companyId}_${signals.length}`, provider: 'LinkedIn', title, description, impactScore, detectedDate });

  const posts = evidence.posts;
  if (posts.length) {
    const scored = posts.filter((p) => p.intentScore !== undefined);
    const best = scored.length ? scored.reduce((x, y) => ((y.intentScore || 0) > (x.intentScore || 0) ? y : x)) : posts[0];
    const latest = posts.reduce((x, y) => (new Date(y.postedAt || 0) > new Date(x.postedAt || 0) ? y : x));
    const ageDays = latest.postedAt ? (now.getTime() - new Date(latest.postedAt).getTime()) / DAY_MS : Infinity;
    const intentPoints = best.intentScore !== undefined ? Math.round(best.intentScore * 0.18) : 8;
    const recencyPoints = ageDays <= 30 ? 6 : ageDays <= 90 ? 3 : 0;
    const countPoints = posts.length >= 2 ? 2 : 0;
    const about = (best.summary || best.signals.slice(0, 3).join(', ') || best.text.slice(0, 140)).trim();
    add(
      'Buying intent',
      [
        `${best.author}${best.authorTitle ? ` (${best.authorTitle})` : ''} posted${best.postedAt ? ` on ${shortDate(best.postedAt)}` : ''}: "${about}"`,
        best.intentScore !== undefined ? `AI intent ${best.intentScore}/100` : 'not scored by AI yet',
        ageDays <= 30 ? 'posted in the last 30 days' : ageDays <= 90 ? 'posted in the last 90 days' : 'older than 90 days',
        posts.length > 1 ? `${posts.length} posts` : '',
      ].filter(Boolean).join(' · '),
      intentPoints + recencyPoints + countPoints,
      best.postedAt?.split('T')[0],
    );
  }

  const people = [...evidence.people].sort((a, b) => relevance(a.jobTitle) - relevance(b.jobTitle));
  if (people[0]) {
    const p = people[0];
    const decides = relevance(p.jobTitle) < 2;
    add(
      'Person found on LinkedIn',
      `${p.name}${p.jobTitle ? ` (${p.jobTitle})` : ''} · ${p.via}${people.length > 1 ? ` · ${people.length} people in total` : ''}${decides ? '' : '. Not a decision maker; look for their CTO or founder'}`,
      decides ? 4 : 2,
    );
  }

  return { points: Math.min(LINKEDIN_MAX_POINTS, signals.reduce((sum, x) => sum + x.impactScore, 0)), signals };
}

type ServiceChoice = {
  name: string; reason: string; fromInr: string; fromUsd: string; model: string;
  matchedBy: 'linkedin' | 'tech' | 'focus'; source: DataSource;
};

/** Catalog services that their LinkedIn posts ask for: technologies named in the posts first, then the area. */
function servicesFromLinkedIn(evidence: LinkedInAccountEvidence | undefined, catalog: CatalogService[]): ServiceChoice[] {
  if (!evidence?.posts.length || !catalog.length) return [];
  const text = evidence.posts.map((p) => [p.text, p.summary, ...p.signals].filter(Boolean).join(' ')).join('\n');
  const toChoice = (svc: CatalogService, reason: string): ServiceChoice => ({
    name: svc.name, reason, fromInr: svc.minInr ? `From ${svc.minInr}` : '', fromUsd: svc.minUsd ? `From ${svc.minUsd}` : '',
    model: svc.model, matchedBy: 'linkedin', source: 'LinkedIn',
  });

  // Longest names first, removing each hit, so "React Native" in a post is not also counted as "React".
  const techs = [...new Set(catalog.flatMap((svc) => svc.stack.split(',').map((t) => t.trim()).filter(Boolean)))].sort((a, b) => b.length - a.length);
  let rest = text;
  const named: string[] = [];
  for (const tech of techs) {
    const pattern = `(^|[^a-z0-9+#])${escapeRe(tech)}(?![a-z0-9+#])`;
    if (new RegExp(pattern, 'i').test(rest)) {
      named.push(tech);
      rest = rest.replace(new RegExp(pattern, 'gi'), ' ');
    }
  }
  const byTech = catalog
    .map((svc) => ({ svc, hits: svc.stack.split(',').map((t) => t.trim()).filter((t) => t && named.some((n) => sameTech(n, t))) }))
    .filter((x) => x.hits.length)
    .sort((a, b) => b.hits.length - a.hits.length)
    .map(({ svc, hits }) => toChoice(svc, `Their LinkedIn post asks for ${hits.slice(0, 4).join(', ')}, which this service covers.`));
  if (byTech.length) return byTech;
  return matchServicesByFocus(text, catalog).map(({ svc, hits }) => toChoice(svc, `Their LinkedIn post is about ${hits.slice(0, 3).join(', ')}, which this service covers.`));
}

/**
 * Buying readiness for the AI Priorities page: the Company 360 fit score from Apollo (scaled to 70 points)
 * plus LinkedIn evidence (up to 30 points). Contact and service are picked from both sources and say which
 * one they came from. Every value is from the data; anything not known is left out, never filled in.
 */
export function calculateBuyingReadiness(
  profile: Company360Profile,
  options: { evaluatedAt?: Date; inCrm?: CrmMatch; override?: TierOverride; linkedin?: LinkedInAccountEvidence; catalog?: CatalogService[] } = {}
): BuyingReadinessDetails {
  const scoring = profile.opportunityScoring;
  const now = new Date();
  const evaluated = (options.evaluatedAt || now).toISOString().split('T')[0];
  const li0 = options.linkedin;
  const evidence = li0 && (li0.posts.length || li0.people.length || li0.fromLinkedInDeal) ? li0 : undefined;

  const apolloFit = scoring.overallScore;
  const apolloPoints = Math.round((apolloFit * APOLLO_MAX_POINTS) / 100);
  const li = scoreLinkedIn(evidence, profile.companyId, now);
  const score = Math.min(100, apolloPoints + li.points);
  const scoredTier = determinePriorityTier(score);
  const priorityTier = options.override?.tier || scoredTier;

  const keySignals: AccountBuyingSignal[] = [
    ...scoring.scoringFactors.map((f, i): AccountBuyingSignal => ({
      id: `sig_${profile.companyId}_${i}`,
      provider: 'Apollo',
      title: f.factorName,
      description: f.description,
      impactScore: f.impactScore,
      detectedDate: evaluated,
    })),
    ...li.signals,
  ];

  // Most relevant person from either source (technology leader, then founder). On a tie the LinkedIn post
  // author wins (they said they need something), then seniority. Nobody is invented when neither found anyone.
  type Candidate = { name: string; jobTitle: string; linkedinUrl?: string; email?: string; source: DataSource; via?: string; rank: number; wrotePost: boolean };
  const candidates: Candidate[] = [];
  const merge = (c: Candidate) => {
    const same = candidates.find((x) => nameKey(x.name) === nameKey(c.name));
    if (!same) { candidates.push(c); return; }
    same.linkedinUrl ||= c.linkedinUrl;
    same.email ||= c.email;
    same.jobTitle ||= c.jobTitle;
    same.via ||= c.via;
    same.wrotePost ||= c.wrotePost;
    if (same.source !== c.source) same.source = 'Apollo + LinkedIn';
  };
  (profile.decisionMakers || []).filter((d) => d.name?.trim()).forEach((d) => merge({
    name: readableName(d.name), jobTitle: d.jobTitle || '', linkedinUrl: d.linkedinUrl || undefined, email: d.email || undefined,
    source: 'Apollo', rank: SENIORITY_RANK[d.seniority] ?? 9, wrotePost: false,
  }));
  (evidence?.people || []).forEach((p) => merge({
    name: p.name, jobTitle: p.jobTitle || '', linkedinUrl: p.linkedinUrl, email: p.email,
    source: 'LinkedIn', via: p.via, rank: 9, wrotePost: /post/i.test(p.via),
  }));
  const contact = candidates.sort((a, b) =>
    relevance(a.jobTitle) - relevance(b.jobTitle) || Number(b.wrotePost) - Number(a.wrotePost) || a.rank - b.rank)[0];
  const companyName = profile.overview.companyName || profile.domain;
  const primaryContact = contact
    ? {
      name: contact.name, jobTitle: contact.jobTitle, linkedinUrl: contact.linkedinUrl,
      linkedinSearchUrl: contact.linkedinUrl ? undefined : linkedinSearchUrl(contact.name, companyName, contact.jobTitle),
      email: contact.email, source: contact.source, via: contact.via,
    }
    : undefined;

  const apolloPeople = (profile.decisionMakers || [])
    .filter((d) => d.name?.trim())
    .sort((a, b) => relevance(a.jobTitle) - relevance(b.jobTitle) || (SENIORITY_RANK[a.seniority] ?? 9) - (SENIORITY_RANK[b.seniority] ?? 9))
    .slice(0, 6)
    .map((d) => {
      const name = readableName(d.name);
      return {
        name, jobTitle: d.jobTitle || '', linkedinUrl: d.linkedinUrl || undefined,
        linkedinSearchUrl: linkedinSearchUrl(name, companyName, d.jobTitle), email: d.email || undefined,
      };
    });

  // Services: what they asked for on LinkedIn first, then Apollo's tech stack match, then what they do.
  const fromApollo: ServiceChoice[] = (profile.recommendedServices || []).map((svc) => ({
    name: svc.serviceName, reason: svc.reasoning, fromInr: svc.estimatedEngagementInr, fromUsd: svc.estimatedEngagementUsd,
    model: svc.suggestedSquad, matchedBy: svc.matchedBy || 'tech', source: 'Apollo',
  }));
  const order = (c: ServiceChoice) => (c.matchedBy === 'linkedin' ? 0 : c.matchedBy === 'tech' ? 1 : 2);
  const choices: ServiceChoice[] = [];
  [...servicesFromLinkedIn(evidence, options.catalog || []), ...fromApollo].sort((a, b) => order(a) - order(b)).forEach((c) => {
    const same = choices.find((x) => x.name === c.name);
    if (!same) { choices.push({ ...c }); return; }
    if (same.source !== c.source) {
      same.source = 'Apollo + LinkedIn';
      same.reason = `${same.reason} ${c.reason}`;
    }
  });
  const matchedService = choices[0];
  const otherServices = choices.slice(1, 4).map((c) => ({ name: c.name, matchedBy: c.matchedBy }));

  const post = evidence?.posts.find((p) => p.outreachAngle) || evidence?.posts[0];
  const recommendedPitch = post?.outreachAngle
    ? `${matchedService ? `Offer ${matchedService.name}. ` : ''}${post.outreachAngle}`
    : post
      ? `Reply to ${post.author}'s LinkedIn post${post.postedAt ? ` of ${shortDate(post.postedAt)}` : ''}${matchedService ? ` and offer ${matchedService.name}. ${matchedService.reason}` : ' and ask what they plan to build.'}`
      : matchedService
        ? `Offer ${matchedService.name}: ${matchedService.reason}${primaryContact ? ` Start with ${primaryContact.name} (${primaryContact.jobTitle}).` : ''}`
        : primaryContact
          ? `Ask ${primaryContact.name} (${primaryContact.jobTitle}) what they plan to build this year.`
          : 'Find a decision maker before pitching.';

  // What is known, from both sources.
  const dataChecklist: BuyingReadinessDetails['dataChecklist'] = [
    ...(scoring.evidence || []).map((e) => ({ ...e, source: 'Apollo' as const })),
    { label: 'Buying intent on LinkedIn', known: !!evidence?.posts.length, hint: 'No post from them yet: run "Scan my keywords" on the LinkedIn page', source: 'LinkedIn' },
    { label: 'Person on LinkedIn', known: !!evidence?.people.length || !!primaryContact?.linkedinUrl, hint: 'Find their CTO or founder with LinkedIn People search', source: 'LinkedIn' },
  ];

  const details: BuyingReadinessDetails = {
    companyId: profile.companyId,
    domain: profile.domain,
    companyName: profile.overview.companyName,
    buyingReadinessScore: score,
    scoreBreakdown: {
      apollo: { fitScore: apolloFit, points: apolloPoints, max: APOLLO_MAX_POINTS },
      linkedin: { points: li.points, max: LINKEDIN_MAX_POINTS, found: !!evidence },
    },
    priorityTier,
    scoredTier,
    tierOverride: options.override,
    dataCoveragePercent: Math.round((dataChecklist.filter((e) => e.known).length / dataChecklist.length) * 100),
    dataChecklist,
    primaryContact,
    apolloPeople,
    linkedinEvidence: evidence ? { posts: evidence.posts, people: evidence.people, fromLinkedInDeal: evidence.fromLinkedInDeal } : undefined,
    linkedinPageUrl: profile.overview.linkedinPageUrl || undefined,
    matchedService,
    otherServices,
    inCrm: options.inCrm,
    nextBestActions: [],
    keySignals,
    recommendedPitch,
    lastEvaluatedDate: evaluated,
    techFundingCheckedAt: profile.apolloSignals?.enrichedAt,
  };
  details.nextBestActions = generateNextBestActions(details);
  return details;
}
