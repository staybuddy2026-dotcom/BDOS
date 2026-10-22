import { Company360Profile } from '../company360/types';
import type { CrmMatch } from '../crm/types';
import { AccountBuyingSignal, BuyingReadinessDetails, PriorityTier, TIER_BANDS, TierOverride } from './types';
import { generateNextBestActions } from './recommendations';

/**
 * Priority tiers for the evidence-based fit score (see company360/scoring.ts). A company only scores
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

const SENIORITY_RANK: Record<string, number> = { 'C-Level': 0, VP: 1, Director: 2, Lead: 3, Manager: 4 };
// Who decides on development work: a technology leader, else the founder / CEO, else other senior people.
const TECH_LEADER = /\b(cto|chief technology|chief technical|vp,? (of )?(engineering|technology|product)|vice president,? (of )?(engineering|technology|product)|head of (engineering|technology|product|development|software)|director of (engineering|technology|software)|engineering director|chief product|cpo|cio|chief information)\b/i;
const FOUNDER = /\b(founder|co-?founder|ceo|chief executive|owner|managing director)\b/i;
const relevance = (title = '') => (TECH_LEADER.test(title) ? 0 : FOUNDER.test(title) ? 1 : 2);

/** Apollo masks surnames until a contact is revealed ("Dennis Wo***e"); show "Dennis W." instead. */
const readableName = (name: string) => name.replace(/\s+([A-Za-z])[A-Za-z]*\*+[A-Za-z]*/g, ' $1.').trim();

/**
 * Buying readiness for the AI Priorities page, taken from the company's Company 360 fit score so both
 * pages agree. Every value is from the profile; anything not known is left out, never filled in.
 */
export function calculateBuyingReadiness(
  profile: Company360Profile,
  options: { evaluatedAt?: Date; inCrm?: CrmMatch; override?: TierOverride } = {}
): BuyingReadinessDetails {
  const scoring = profile.opportunityScoring;
  const score = scoring.overallScore;
  const scoredTier = determinePriorityTier(score);
  const priorityTier = options.override?.tier || scoredTier;
  const evaluated = (options.evaluatedAt || new Date()).toISOString().split('T')[0];

  const keySignals: AccountBuyingSignal[] = scoring.scoringFactors.map((f, i) => ({
    id: `sig_${profile.companyId}_${i}`,
    provider: 'Apollo',
    title: f.factorName,
    description: f.description,
    impactScore: f.impactScore,
    detectedDate: evaluated,
  }));

  // Most relevant named person first (technology leader, then founder); nobody is invented when Apollo found no one.
  const contact = [...(profile.decisionMakers || [])]
    .filter((d) => d.name?.trim())
    .sort((a, b) => relevance(a.jobTitle) - relevance(b.jobTitle) || (SENIORITY_RANK[a.seniority] ?? 9) - (SENIORITY_RANK[b.seniority] ?? 9))[0];
  const primaryContact = contact
    ? { name: readableName(contact.name), jobTitle: contact.jobTitle, linkedinUrl: contact.linkedinUrl || undefined, email: contact.email || undefined }
    : undefined;

  const service = profile.recommendedServices?.[0];
  const matchedService = service
    ? { name: service.serviceName, reason: service.reasoning, fromInr: service.estimatedEngagementInr, fromUsd: service.estimatedEngagementUsd, model: service.suggestedSquad, matchedBy: service.matchedBy || 'tech' }
    : undefined;

  const recommendedPitch = matchedService
    ? `Offer ${matchedService.name}: ${matchedService.reason}${primaryContact ? ` Start with ${primaryContact.name} (${primaryContact.jobTitle}).` : ''}`
    : primaryContact
      ? `Ask ${primaryContact.name} (${primaryContact.jobTitle}) what they plan to build this year.`
      : 'Find a decision maker before pitching.';

  const details: BuyingReadinessDetails = {
    companyId: profile.companyId,
    domain: profile.domain,
    companyName: profile.overview.companyName,
    buyingReadinessScore: score,
    priorityTier,
    scoredTier,
    tierOverride: options.override,
    dataCoveragePercent: scoring.confidenceScorePercent,
    dataChecklist: scoring.evidence || [],
    primaryContact,
    linkedinPageUrl: profile.overview.linkedinPageUrl || undefined,
    matchedService,
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
