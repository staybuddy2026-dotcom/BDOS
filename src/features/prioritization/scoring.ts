import { Company360Profile } from '../company360/types';
import { AccountBuyingSignal, BuyingReadinessDetails, PriorityTier } from './types';
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
  if (score >= 80) return 'IMMEDIATE';
  if (score >= 65) return 'HIGH';
  if (score >= 45) return 'MEDIUM';
  if (score >= 25) return 'MONITOR';
  return 'ARCHIVE';
}

/** Points of the named factor scaled to 0-100 (each factor is worth up to 20 points); 0 when not found. */
const factorPercent = (profile: Company360Profile, name: string) =>
  Math.min(100, (profile.opportunityScoring.scoringFactors.find((f) => f.factorName === name)?.impactScore || 0) * 5);

/**
 * Buying readiness for the AI Priorities page, taken from the company's Company 360 fit score so both
 * pages agree. Every number is either from that score's evidence or left at 0 / empty when unknown.
 */
export function calculateBuyingReadiness(profile: Company360Profile): BuyingReadinessDetails {
  const scoring = profile.opportunityScoring;
  const score = scoring.overallScore;
  const priorityTier = determinePriorityTier(score);
  const topService = profile.recommendedServices?.[0];
  const today = new Date().toISOString().split('T')[0];

  const keySignals: AccountBuyingSignal[] = scoring.scoringFactors.map((f, i) => ({
    id: `sig_${profile.companyId}_${i}`,
    provider: 'Apollo',
    title: f.factorName,
    description: f.description,
    impactScore: f.impactScore,
    detectedDate: today,
  }));

  const contact = profile.decisionMakers?.[0];
  const recommendedPitch = topService
    ? `Offer ${topService.serviceName}: ${topService.reasoning}${contact ? ` Start with ${contact.name} (${contact.jobTitle}).` : ''}`
    : contact
      ? `Ask ${contact.name} (${contact.jobTitle}) what they need to ship this year.`
      : 'Find a decision maker before pitching.';

  return {
    companyId: profile.companyId,
    domain: profile.domain,
    companyName: profile.overview.companyName,
    buyingReadinessScore: score,
    priorityTier,
    winProbabilityPercent: score,
    estimatedDealValueInr: topService?.estimatedEngagementInr || '',
    estimatedDealValueUsd: topService?.estimatedEngagementUsd || '',
    expectedSalesCycle: '',
    technicalMatchScore: topService?.fitScore || 0,
    budgetConfidence: scoring.confidenceScorePercent,
    growthVelocityScore: Math.max(factorPercent(profile, 'Funding'), factorPercent(profile, 'Hiring')),
    engineeringExpansionIndex: factorPercent(profile, 'Hiring'),
    executiveEngagementScore: factorPercent(profile, 'Decision makers found'),
    nextBestActions: generateNextBestActions(profile, priorityTier),
    keySignals,
    recommendedPitch,
    suggestedSquad: topService?.suggestedSquad || '',
    lastEvaluatedDate: today,
  };
}
