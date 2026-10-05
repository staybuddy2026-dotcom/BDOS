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

/**
 * Company fit score (0-100) from evidence that was actually found. Each factor is listed with what it is
 * based on; a source with no data adds nothing. `confidenceScorePercent` is how much of the evidence was
 * available, not a guess at the outcome.
 */
export function calculateAiOpportunityScore(
  overview: CompanyOverviewData,
  engineering: EngineeringIntelligenceData,
  decisionMakers: DecisionMakerContact[],
  growth?: GrowthIntelligenceData,
  _productHunt?: ProductHuntIntelligenceData,
  _reddit?: RedditIntelligenceData,
  linkedin?: LinkedInIntelligenceData
): AiOpportunityScoreDetails {
  logger.info(`Calculating fit score for '${overview.companyName}'...`);

  const factors: AiOpportunityScoreDetails['scoringFactors'] = [];
  const add = (factorName: string, impactScore: number, description: string) => factors.push({ factorName, impactScore, description });
  let evidence = 0;
  const POSSIBLE = 5;

  if (overview.industry || overview.employeeCount) {
    evidence++;
    const size = overview.employeeCount;
    // Companies big enough to buy a team but not so big they only use large vendors fit best.
    const sizePoints = !size ? 5 : size >= 20 && size <= 2000 ? 20 : size < 20 ? 8 : 12;
    add('Company profile', sizePoints, `${overview.industry || 'Industry unknown'}${size ? `, about ${size.toLocaleString('en-US')} employees` : ''} (Apollo)`);
  }
  const named = decisionMakers.filter((d) => d.name);
  if (named.length) {
    evidence++;
    add('Decision makers found', Math.min(20, 8 + named.length * 3), `${named.length} senior contact${named.length === 1 ? '' : 's'} in Apollo, e.g. ${named[0].name} (${named[0].jobTitle})`);
  }
  const stack = engineering.primaryLanguages;
  if (stack.length) {
    evidence++;
    add('Known tech stack', Math.min(20, 6 + stack.length * 2), `Detected: ${stack.slice(0, 6).join(', ')}`);
  }
  if (growth && (growth.latestRoundName || growth.latestRoundDate)) {
    evidence++;
    const recent = growth.latestRoundDate && Date.now() - new Date(growth.latestRoundDate).getTime() < 365 * 86400000;
    add('Funding', recent ? 20 : 10, `${growth.latestRoundName || 'Funding round'}${growth.latestRoundDate ? ` (${growth.latestRoundDate})` : ''}${growth.latestRoundAmountUsd ? `, ${growth.latestRoundAmountUsd}` : ''}`);
  }
  if (linkedin?.activeJobOpeningsCount) {
    evidence++;
    add('Hiring', Math.min(20, 8 + linkedin.activeJobOpeningsCount), `${linkedin.activeJobOpeningsCount} open job${linkedin.activeJobOpeningsCount === 1 ? '' : 's'} (Apollo)`);
  }

  const overallScore = Math.min(100, factors.reduce((sum, f) => sum + f.impactScore, 0));
  return {
    overallScore,
    // The score is the best available estimate; there is no separate win model behind it.
    winProbabilityPercent: overallScore,
    estimatedDealSizeInr: '',
    estimatedDealSizeUsd: '',
    salesPriority: overallScore >= 70 ? 'HIGH' : overallScore >= 40 ? 'MEDIUM' : 'LOW',
    confidenceScorePercent: Math.round((evidence / POSSIBLE) * 100),
    scoringFactors: factors,
  };
}

/**
 * Services from the team's catalog that match technology the company is known to use. A service is only
 * recommended when there is an overlap; the price is the catalog's starting price.
 */
export function generateRecommendedServices(
  engineering: EngineeringIntelligenceData,
  catalog: CatalogService[] = []
): RecommendedServiceItem[] {
  const detected = engineering.primaryLanguages;
  if (!detected.length) return [];
  return catalog
    .map((svc) => {
      const stack = svc.stack.split(',').map((t) => t.trim()).filter(Boolean);
      const matches = stack.filter((t) => detected.some((d) => sameTech(d, t)));
      return { svc, matches };
    })
    .filter((x) => x.matches.length)
    .sort((a, b) => b.matches.length - a.matches.length)
    .slice(0, 4)
    .map(({ svc, matches }) => ({
      id: `svc_${svc.id}`,
      serviceName: svc.name,
      category: svc.model,
      reasoning: `They use ${matches.slice(0, 4).join(', ')}, which this service covers.`,
      detectedTechTrigger: matches,
      estimatedEngagementInr: svc.minInr ? `From ${svc.minInr}` : '',
      estimatedEngagementUsd: svc.minUsd ? `From ${svc.minUsd}` : '',
      suggestedSquad: svc.model,
      fitScore: Math.min(95, 50 + matches.length * 10),
    }));
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
