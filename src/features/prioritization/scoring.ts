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

  const keySignals = [
    {
      id: 'sig_prio_1',
      provider: 'Crunchbase' as const,
      title: profile.growth ? `${profile.growth.latestRoundName} (${profile.growth.latestRoundAmountUsd})` : 'Series B ($32M USD)',
      description: 'Capital allocated for scaling engineering team.',
      impactScore: 25,
      detectedDate: '2026-02-15',
    },
    {
      id: 'sig_prio_2',
      provider: 'Product Hunt' as const,
      title: profile.productHunt ? `${profile.productHunt.primaryProduct.name} (#1 Product of Day)` : 'Product Hunt Launch',
      description: '1,420 upvotes with high post-MVP scaling intent.',
      impactScore: 22,
      detectedDate: '2026-02-10',
    },
    {
      id: 'sig_prio_3',
      provider: 'LinkedIn' as const,
      title: profile.linkedin ? `${profile.linkedin.activeJobOpeningsCount} Engineering Roles Open` : '8 Active Roles Open',
      description: 'Hiring React 19, Next.js, and Python FastAPI engineers.',
      impactScore: 20,
      detectedDate: '2026-02-18',
    },
    {
      id: 'sig_prio_4',
      provider: 'Reddit' as const,
      title: profile.reddit ? `${profile.reddit.totalDiscussionsCount} Subreddit Buying Intent Posts` : 'Active Subreddit Posts',
      description: 'Outsourcing requests in r/reactjs & r/artificial.',
      impactScore: 18,
      detectedDate: '2026-02-14',
    },
  ];

  return {
    companyId: profile.companyId,
    domain: profile.domain,
    companyName: profile.overview.companyName,
    buyingReadinessScore: totalScore,
    priorityTier,
    winProbabilityPercent: Math.min(98, Math.round(totalScore * 0.96)),
    estimatedDealValueInr: '₹25,00,000 – ₹45,00,000',
    estimatedDealValueUsd: '$30,000 – $55,000',
    expectedSalesCycle: '1 – 2 Weeks',
    technicalMatchScore: Math.min(99, Math.round(githubScore * 1.05)),
    budgetConfidence: 94,
    growthVelocityScore: growthScore,
    engineeringExpansionIndex: linkedinScore,
    executiveEngagementScore: apolloScore,
    nextBestActions,
    keySignals,
    recommendedPitch: `Offer Tiny Script's senior React 19 & Python FastAPI squad as the immediate delivery accelerator for CTO.`,
    suggestedSquad: '2-Senior React 19 + 2-Node.js Microservices Squad',
    lastEvaluatedDate: new Date().toISOString().split('T')[0],
  };
}
