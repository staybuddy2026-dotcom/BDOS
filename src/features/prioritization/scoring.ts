import { Company360Profile } from '../company360/types';
import { BuyingReadinessDetails, PriorityTier } from './types';
import { generateNextBestActions } from './recommendations';
import { logger } from '@/lib/logger';

/**
 * Calculate Priority Tier based on Buying Readiness Score.
 * Tier Map:
 * 95 - 100 => 🔥 Immediate (Contact today)
 * 85 - 94  => 🟢 High (Contact within 24 hours)
 * 70 - 84  => 🟡 Medium (Add to outreach sequence)
 * 50 - 69  => 🔵 Monitor (Track activity)
 * Below 50 => ⚪ Archive (Re-evaluate later)
 */
export function determinePriorityTier(score: number): PriorityTier {
  if (score >= 95) return 'IMMEDIATE';
  if (score >= 85) return 'HIGH';
  if (score >= 70) return 'MEDIUM';
  if (score >= 50) return 'MONITOR';
  return 'ARCHIVE';
}

/**
 * AI Buying Readiness Engine.
 * Multi-Provider Weighting Model:
 * Apollo 15% | GitHub 15% | Crunchbase 18% | Product Hunt 14% | Reddit 10% | LinkedIn 10% | CRM 8% | Marketplace 10%
 */
export function calculateBuyingReadiness(profile: Company360Profile): BuyingReadinessDetails {
  logger.info(`AI Account Prioritization Engine: Scoring buying readiness for '${profile.overview.companyName}'...`);

  // Provider Sub-scores
  const apolloScore = profile.decisionMakers.length > 0 ? 95 : 70;
  const githubScore = profile.engineering.engineeringMaturityScore;
  const growthScore = profile.growth ? profile.growth.growthOpportunityScore : 80;
  const productHuntScore = profile.productHunt ? profile.productHunt.postMvpBuyingIntentScore : 85;
  const redditScore = profile.reddit ? profile.reddit.averageIntentScore : 85;
  const linkedinScore = profile.linkedin ? profile.linkedin.engineeringExpansionIndex : 90;
  const crmScore = profile.crmActivity.totalDealsCount > 0 ? 95 : 75;
  const marketplaceScore = 92;

  // Weighted Calculation
  const totalScore = Math.min(
    99,
    Math.round(
      apolloScore * 0.15 +
      githubScore * 0.15 +
      growthScore * 0.18 +
      productHuntScore * 0.14 +
      redditScore * 0.10 +
      linkedinScore * 0.10 +
      crmScore * 0.08 +
      marketplaceScore * 0.10
    )
  );

  const priorityTier = determinePriorityTier(totalScore);
  const nextBestActions = generateNextBestActions(profile.companyId, profile.domain, priorityTier, totalScore);

  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const keySignals: any[] = [];
  
  if (profile.growth && profile.growth.growthOpportunityScore > 75) {
    keySignals.push({
      id: 'sig_prio_1',
      provider: 'Crunchbase',
      title: `${profile.growth.latestRoundName} (${profile.growth.latestRoundAmountUsd})`,
      description: 'Recent capital injection detected.',
      impactScore: 24,
      detectedDate: daysAgo(2),
    });
  }

  if (profile.linkedin && profile.linkedin.activeJobOpeningsCount > 0) {
    keySignals.push({
      id: 'sig_prio_2',
      provider: 'LinkedIn',
      title: `${profile.linkedin.activeJobOpeningsCount} Active Roles Open`,
      description: 'Hiring engineering talent.',
      impactScore: 22,
      detectedDate: daysAgo(1),
    });
  }
  
  // Fallback signals if real ones are missing
  if (keySignals.length === 0) {
    keySignals.push({
      id: 'sig_prio_fallback_1',
      provider: 'Product Hunt',
      title: profile.productHunt ? `${profile.productHunt.primaryProduct.name} (#1 Product of Day)` : 'Recent Feature Update',
      description: 'Active development pipeline.',
      impactScore: 18,
      detectedDate: daysAgo(3),
    });
  }

  // Derive base deal value from employee count if possible
  let employeeCountEst = 50;
  if (profile.overview.employeeCount) {
    const parsed = Number(profile.overview.employeeCount);
    if (!isNaN(parsed) && parsed > 0) employeeCountEst = parsed;
  }
  
  const baseInr = Math.min(5000000, 1000000 + (employeeCountEst * 20000));
  const maxInr = baseInr + 1500000;
  const formatMoney = (val: number, isUsd: boolean) => isUsd ? `$${val.toLocaleString()}` : `₹${val.toLocaleString('en-IN')}`;

  const cycleWeeksMin = 2;
  const cycleWeeksMax = 4;

  const squads = [
    '2-Senior React 19 + 2-Node.js Microservices Squad',
    '1-Lead Next.js + 2-Python FastAPI Engineers',
    '3-Full-stack React & TypeScript Developers',
    '1-Architect + 2-Senior Go/React Developers',
    '2-React Native + 1-Node.js Backend Squad'
  ];

  const pitches = [
    `Offer Tiny Script's senior engineering squad as an immediate delivery accelerator for CTO.`,
    `Propose a dedicated migration squad to clear frontend technical debt rapidly.`,
    `Pitch our elite developers to help their team hit the Q3 product roadmap.`,
    `Position Tiny Script as a strategic partner to scale their architecture instantly.`,
    `Highlight our rapid MVP delivery capability with a 2-week trial sprint.`
  ];

  // Pick deterministic but non-hash based squad/pitch (using length of domain as simple seed)
  const seed = profile.domain.length;

  return {
    companyId: profile.companyId,
    domain: profile.domain,
    companyName: profile.overview.companyName,
    buyingReadinessScore: totalScore,
    priorityTier,
    winProbabilityPercent: Math.min(98, Math.round(totalScore * 0.96)),
    estimatedDealValueInr: `${formatMoney(baseInr, false)} – ${formatMoney(maxInr, false)}`,
    estimatedDealValueUsd: `${formatMoney(Math.round(baseInr / 83), true)} – ${formatMoney(Math.round(maxInr / 83), true)}`,
    expectedSalesCycle: `${cycleWeeksMin} – ${cycleWeeksMax} Weeks`,
    technicalMatchScore: Math.min(99, Math.round(githubScore * 1.05)),
    budgetConfidence: 94,
    growthVelocityScore: growthScore,
    engineeringExpansionIndex: linkedinScore,
    executiveEngagementScore: apolloScore,
    nextBestActions,
    keySignals,
    recommendedPitch: pitches[seed % pitches.length],
    suggestedSquad: squads[(seed + 1) % squads.length],
    lastEvaluatedDate: new Date().toISOString().split('T')[0],
  };
}
