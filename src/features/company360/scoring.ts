import {
  CompanyOverviewData,
  EngineeringIntelligenceData,
  DecisionMakerContact,
  AiOpportunityScoreDetails,
  RecommendedServiceItem,
  ExecutiveAiBriefing
} from './types';
import { GrowthIntelligenceData } from '../crunchbase/types';
import { ProductHuntIntelligenceData } from '../producthunt/types';
import { RedditIntelligenceData } from '../reddit/types';
import { LinkedInIntelligenceData } from '../linkedin/types';
import { logger } from '@/lib/logger';
import { sameTech } from '@/lib/techMatch';

/** A service from the team's catalog (Settings > Service catalog). */
export type CatalogService = { id: string; name: string; minUsd: string; minInr: string; stack: string; model: string };

/** Extra Apollo facts used by the score (company search returns these for free). */
export type ScoreSignals = {
  /** Apollo keyword tags: what the company does. */
  keywords?: string[];
  /** Headcount change as a fraction (0.12 = +12%). */
  headcountGrowth6m?: number;
  headcountGrowth12m?: number;
  /** Set once tech stack and funding were looked up (company enrichment, 1 credit). */
  enrichedAt?: string;
};

// Roles that decide on buying development work.
const TECH_LEADER = /\b(cto|chief technology|chief technical|vp,? (of )?(engineering|technology|product)|vice president,? (of )?(engineering|technology|product)|head of (engineering|technology|product|development|software)|director of (engineering|technology|software)|engineering director|chief product|cpo|cio|chief information)\b/i;
// "Owner" only as the business owner, not a job title such as "Product Owner" or "Process Owner".
const FOUNDER = /\b(founder|co-?founder|ceo|chief executive|managing director)\b|^\s*(business |company )?owner\b|(&|\/|,|\band) *owner\b/i;
// Companies that build digital products (likely buyers of development work).
const DIGITAL_PRODUCT = /\b(saas|software|platform|mobile app|apps?|e-?commerce|marketplace|fintech|healthtech|edtech|insurtech|proptech|internet|online|digital|ai|artificial intelligence|machine learning|data|cloud|startup|consumer tech)\b/i;
// IT services / outsourcing firms sell the same thing: usually competitors or partners, not buyers. Checked on
// Apollo's keyword tags only: its industry label "information technology & services" also covers product
// companies such as Google or Freshworks ("IT service management" is a product, not a service firm).
const IT_SERVICES = /\b(it services|it solutions|business process outsourcing|outsourcing services|software development services|it consulting|technology consulting|staff augmentation|offshore development|custom software development|web development company|digital agency|engineering services)\b/i;

const pctText = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;

/**
 * Company fit score (0-100) from evidence that was actually found. Five parts of up to 20 points:
 * company size, the right person to talk to, growth, fit with our services, and funding. Each part is
 * listed with what it is based on; a part with no data adds nothing and is not counted in
 * `confidenceScorePercent`, which is how much of the evidence was available, not a guess at the outcome.
 */
export function calculateAiOpportunityScore(
  overview: CompanyOverviewData,
  engineering: EngineeringIntelligenceData,
  decisionMakers: DecisionMakerContact[],
  growth?: GrowthIntelligenceData,
  _productHunt?: ProductHuntIntelligenceData,
  _reddit?: RedditIntelligenceData,
  linkedin?: LinkedInIntelligenceData,
  extra: { signals?: ScoreSignals; catalog?: CatalogService[] } = {}
): AiOpportunityScoreDetails {
  logger.info(`Calculating fit score for '${overview.companyName}'...`);
  const signals = extra.signals || {};
  const factors: AiOpportunityScoreDetails['scoringFactors'] = [];
  const add = (factorName: string, impactScore: number, description: string) => factors.push({ factorName, impactScore, description });
  const size = overview.employeeCount;

  // 1. Company size: big enough to buy a team, not so big they only use large vendors.
  if (overview.industry || size) {
    const points = !size ? 5 : size >= 20 && size <= 2000 ? 20 : size < 20 ? 8 : size <= 10000 ? 12 : 6;
    add('Company size', points, `${size ? `About ${size.toLocaleString('en-US')} employees` : 'Size unknown'}${overview.industry ? `, ${overview.industry}` : ''} (Apollo)`);
  }

  // 2. The right person: a technology leader decides on development work; at a small company the founder does.
  const named = decisionMakers.filter((d) => d.name);
  if (named.length) {
    const tech = named.find((d) => TECH_LEADER.test(d.jobTitle || ''));
    const founder = named.find((d) => FOUNDER.test(d.jobTitle || ''));
    if (tech) add('Right person found', 20, `Technology leader in Apollo: ${tech.name} (${tech.jobTitle})`);
    else if (founder) {
      const small = !size || size <= 200;
      add('Right person found', small ? 18 : 12, `${small ? 'Founder or CEO of a small company' : 'Founder or CEO (no technology leader found)'}: ${founder.name} (${founder.jobTitle})`);
    } else add('Right person found', 6, `Only other senior roles found, e.g. ${named[0].name} (${named[0].jobTitle}). Find their CTO or engineering lead.`);
  }

  // 3. Growth: headcount change (free in Apollo search) and open jobs when known.
  const g = signals.headcountGrowth12m ?? signals.headcountGrowth6m;
  const jobs = linkedin?.activeJobOpeningsCount || 0;
  if (g !== undefined || jobs) {
    const headcountPoints = g === undefined ? 0 : g >= 0.2 ? 20 : g >= 0.1 ? 15 : g >= 0.03 ? 10 : g > 0 ? 5 : 0;
    const jobPoints = jobs ? Math.min(20, 8 + jobs) : 0;
    const parts = [
      g !== undefined && `headcount ${pctText(g)} in ${signals.headcountGrowth12m !== undefined ? '12' : '6'} months`,
      jobs && `${jobs} open job${jobs === 1 ? '' : 's'}`,
    ].filter(Boolean);
    add('Growth', Math.max(headcountPoints, jobPoints), `${parts.join(', ')} (Apollo)${g !== undefined && g <= 0 && !jobs ? '. Not growing right now.' : ''}`);
  }

  // 4. Fit with our services: a tech stack match with the catalog is the strongest; otherwise what they do.
  const stack = engineering.primaryLanguages || [];
  const catalogTech = (extra.catalog || []).flatMap((svc) => svc.stack.split(',').map((t) => t.trim()).filter(Boolean));
  const matchedTech = stack.filter((t) => catalogTech.some((c) => sameTech(t, c)));
  const about = [overview.industry, ...(signals.keywords || [])].filter(Boolean).join(', ');
  const focusMatch = matchServicesByFocus(about, extra.catalog || [])[0];
  if (stack.length || about) {
    if (matchedTech.length) {
      add('Service fit', matchedTech.length >= 2 ? 20 : 14, `Uses ${matchedTech.slice(0, 4).join(', ')}, which your service catalog covers`);
    } else if (IT_SERVICES.test((signals.keywords || []).join(', '))) {
      add('Service fit', 0, 'Looks like an IT services or outsourcing company: usually a competitor or partner, not a buyer');
    } else if (focusMatch) {
      add('Service fit', 12, `They work on ${focusMatch.hits.slice(0, 3).join(', ')}: fits your "${focusMatch.svc.name}" service${stack.length ? '' : '. Tech stack not looked up yet'}`);
    } else if (DIGITAL_PRODUCT.test(about)) {
      const hit = about.match(DIGITAL_PRODUCT)?.[0];
      add('Service fit', 10, `Builds digital products (${hit})${stack.length ? '; its tech stack is not in your service catalog' : '. Tech stack not looked up yet'}`);
    } else {
      add('Service fit', stack.length ? 4 : 2, stack.length ? `Tech stack (${stack.slice(0, 3).join(', ')}) not in your service catalog` : `No sign they build software products (${about.slice(0, 80)})`);
    }
  }

  // 5. Funding: only known after the tech & funding lookup (or when Apollo search happens to include it).
  if (growth && (growth.latestRoundName || growth.latestRoundDate)) {
    const ageDays = growth.latestRoundDate ? (Date.now() - new Date(growth.latestRoundDate).getTime()) / 86400000 : Infinity;
    add('Funding', ageDays <= 365 ? 20 : ageDays <= 730 ? 12 : 6, `${growth.latestRoundName || 'Funding round'}${growth.latestRoundDate ? ` (${growth.latestRoundDate})` : ''}${growth.latestRoundAmountUsd ? `, ${growth.latestRoundAmountUsd}` : ''}`);
  } else if (signals.enrichedAt) {
    add('Funding', 0, 'No funding round on record in Apollo');
  }

  const overallScore = Math.min(100, factors.reduce((sum, f) => sum + f.impactScore, 0));

  // Data coverage: eight concrete facts, so two companies only share a percentage when Apollo really
  // knows the same amount about them (the five score parts alone made almost every company 60%).
  const lookedUp = !!signals.enrichedAt;
  const evidenceList: NonNullable<AiOpportunityScoreDetails['evidence']> = [
    { label: 'Company size', known: !!size },
    { label: 'What they do', known: !!(signals.keywords?.length || overview.industry) },
    { label: 'Senior people', known: named.length > 0, hint: 'Search Apollo for people at the company' },
    { label: 'Technology or product leader', known: named.some((d) => TECH_LEADER.test(d.jobTitle || '')), hint: 'Find their CTO or engineering lead' },
    { label: 'Headcount growth', known: signals.headcountGrowth12m !== undefined || signals.headcountGrowth6m !== undefined, hint: 'Not in Apollo for this company' },
    { label: 'Open jobs', known: !!jobs, hint: 'Not in Apollo for this company' },
    { label: 'Tech stack', known: stack.length > 0, hint: lookedUp ? 'Apollo has no tech stack on file' : 'Get tech stack & funding (1 credit)' },
    { label: 'Funding', known: lookedUp || !!(growth && (growth.latestRoundName || growth.latestRoundDate)), hint: 'Get tech stack & funding (1 credit)' },
  ];

  return {
    overallScore,
    // The score is the best available estimate; there is no separate win model behind it.
    winProbabilityPercent: overallScore,
    estimatedDealSizeInr: '',
    estimatedDealSizeUsd: '',
    salesPriority: overallScore >= 70 ? 'HIGH' : overallScore >= 40 ? 'MEDIUM' : 'LOW',
    confidenceScorePercent: Math.round((evidenceList.filter((e) => e.known).length / evidenceList.length) * 100),
    evidence: evidenceList,
    scoringFactors: factors,
  };
}

/**
 * Service areas: what a company does (Apollo keywords, industry) and the catalog services for that area
 * (matched on the service name). Used when the tech stack is not known yet.
 */
const SERVICE_AREAS: { company: RegExp; service: RegExp }[] = [
  { company: /\b(ai|artificial intelligence|machine learning|deep learning|llm|generative ai|data science|computer vision|nlp|ai agents)\b/i, service: /\b(ai|machine learning|ml|llm|data)\b/i },
  { company: /\b(mobile|apps?|android|ios|iphone|app store)\b/i, service: /\b(mobile|apps?|android|ios)\b/i },
  { company: /\b(e-?commerce|retail|online (store|shop|shopping)|shopping|marketplace|d2c|direct to consumer|supermarket|hypermarket)\b/i, service: /\b(e-?commerce|retail|shop)\b/i },
  { company: /\b(saas|software development|software|web|platform|portal|fintech|insurtech|proptech|edtech|healthtech|legaltech|startup|online)\b/i, service: /\b(web|saas)\b/i }, // not "platform": "Cross-Platform Mobile" and "E-Commerce Platforms" are other areas
  { company: /\b(cloud|devops|infrastructure|hosting|data cent(er|re)|cybersecurity|telecommunications|network(ing)?)\b/i, service: /\b(cloud|devops|backend|infrastructure)\b/i },
  { company: /\b(design|ux|ui|user experience|branding|creative)\b/i, service: /\b(design|ux|ui)\b/i },
];

/** Catalog services that fit what the company does (no tech stack needed). IT services firms get none. */
export function matchServicesByFocus(focusText: string, catalog: CatalogService[]): { svc: CatalogService; hits: string[] }[] {
  if (!focusText.trim() || IT_SERVICES.test(focusText)) return [];
  return catalog
    .map((svc) => {
      const hits = SERVICE_AREAS
        .filter((area) => area.service.test(svc.name))
        .flatMap((area) => [...new Set((focusText.match(new RegExp(area.company.source, 'gi')) || []).map((h) => h.toLowerCase()))]);
      return { svc, hits: [...new Set(hits)] };
    })
    .filter((x) => x.hits.length)
    .sort((a, b) => b.hits.length - a.hits.length);
}

/**
 * Services from the team's catalog for this company. A tech stack match is the strongest ("They use
 * React, which this service covers"); without a known stack, services are matched on what the company
 * does ("They work on mobile apps"). The price is the catalog's starting price.
 */
export function generateRecommendedServices(
  engineering: EngineeringIntelligenceData,
  catalog: CatalogService[] = [],
  focus: { keywords?: string[]; industry?: string } = {}
): RecommendedServiceItem[] {
  const toItem = (svc: CatalogService, reasoning: string, triggers: string[], fitScore: number, matchedBy: 'tech' | 'focus'): RecommendedServiceItem => ({
    id: `svc_${svc.id}`,
    serviceName: svc.name,
    category: svc.model,
    reasoning,
    detectedTechTrigger: triggers,
    estimatedEngagementInr: svc.minInr ? `From ${svc.minInr}` : '',
    estimatedEngagementUsd: svc.minUsd ? `From ${svc.minUsd}` : '',
    suggestedSquad: svc.model,
    fitScore,
    matchedBy,
  });

  const detected = engineering.primaryLanguages || [];
  const byTech = detected.length
    ? catalog
      .map((svc) => ({ svc, matches: svc.stack.split(',').map((t) => t.trim()).filter((t) => t && detected.some((d) => sameTech(d, t))) }))
      .filter((x) => x.matches.length)
      .sort((a, b) => b.matches.length - a.matches.length)
    : [];
  if (byTech.length) {
    return byTech.slice(0, 4).map(({ svc, matches }) =>
      toItem(svc, `They use ${matches.slice(0, 4).join(', ')}, which this service covers.`, matches, Math.min(95, 50 + matches.length * 10), 'tech'));
  }

  const focusText = [focus.industry, ...(focus.keywords || [])].filter(Boolean).join(', ');
  return matchServicesByFocus(focusText, catalog).slice(0, 4).map(({ svc, hits }) =>
    toItem(svc, `They work on ${hits.slice(0, 3).join(', ')} (Apollo), which this service covers.`, hits, Math.min(70, 45 + hits.length * 5), 'focus'));
}

/** Short briefing built from what the profile actually contains. */
export function generateExecutiveBriefing(
  overview: CompanyOverviewData,
  engineering: EngineeringIntelligenceData,
  decisionMakers: DecisionMakerContact[],
  opportunityScore: AiOpportunityScoreDetails
): ExecutiveAiBriefing {
  const cto = decisionMakers.find((dm) => /\bcto\b|chief technology/i.test(dm.jobTitle)) || decisionMakers[0];
  const highlights = [
    overview.employeeCount ? `About ${overview.employeeCount.toLocaleString('en-US')} employees${overview.headquarters ? `, based in ${overview.headquarters}` : ''}.` : '',
    engineering.primaryLanguages.length ? `Tech stack: ${engineering.primaryLanguages.slice(0, 6).join(', ')}.` : '',
    overview.fundingStage && overview.fundingStage !== 'Undisclosed' ? `Funding: ${overview.fundingStage}${overview.fundingTotal && overview.fundingTotal !== 'Undisclosed' ? ` (${overview.fundingTotal} raised)` : ''}.` : '',
    cto ? `Contact: ${cto.name} (${cto.jobTitle}).` : 'No senior contact found yet.',
  ].filter(Boolean);

  return {
    summary: [overview.companyName, overview.industry ? `works in ${overview.industry}` : '', overview.companyDescription ? `— ${overview.companyDescription.slice(0, 220)}` : ''].filter(Boolean).join(' '),
    keyHighlights: highlights,
    engineeringStatus: engineering.primaryLanguages.length ? 'Tech stack known' : 'Tech stack not known yet',
    recommendedNextAction: cto ? `Reach out to ${cto.name} (${cto.jobTitle})` : 'Find a technical decision maker in Apollo Search',
    recommendedFirstEngagement: 'Discovery call to confirm their plans and needs',
    estimatedProjectPotentialInr: opportunityScore.estimatedDealSizeInr,
    confidencePercent: opportunityScore.confidenceScorePercent,
  };
}

/**
 * Recomputes the fit score and matching services of a saved profile with the current rules and service
 * catalog. Cheap (no Apollo call), so pages rescore on every load: a catalog change or a rule change
 * shows at once instead of after the weekly profile refresh.
 */
export function rescoreProfile<P extends {
  overview: CompanyOverviewData;
  engineering: EngineeringIntelligenceData;
  decisionMakers: DecisionMakerContact[];
  growth?: GrowthIntelligenceData;
  linkedin?: LinkedInIntelligenceData;
  apolloSignals?: ScoreSignals;
  opportunityScoring: AiOpportunityScoreDetails;
  recommendedServices: RecommendedServiceItem[];
}>(profile: P, catalog: CatalogService[]): P {
  if (!profile?.overview || !profile.engineering) return profile;
  const opportunityScoring = calculateAiOpportunityScore(
    profile.overview, profile.engineering, profile.decisionMakers || [], profile.growth, undefined, undefined, profile.linkedin,
    { signals: profile.apolloSignals, catalog },
  );
  const focus = { keywords: profile.apolloSignals?.keywords, industry: profile.overview.industry };
  return { ...profile, opportunityScoring, recommendedServices: generateRecommendedServices(profile.engineering, catalog, focus) };
}
