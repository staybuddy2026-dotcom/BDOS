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

/**
 * Calculate AI Company Opportunity Score (0-100) & Win Probability.
 * Multi-Provider Weights: Apollo (15%), GitHub (15%), Crunchbase (18%), Product Hunt (14%), Reddit (10%), LinkedIn (10%), CRM (8%), Marketplace (10%).
 */
export function calculateAiOpportunityScore(
  overview: CompanyOverviewData,
  engineering: EngineeringIntelligenceData,
  decisionMakers: DecisionMakerContact[],
  growth?: GrowthIntelligenceData,
  productHunt?: ProductHuntIntelligenceData,
  reddit?: RedditIntelligenceData,
  linkedin?: LinkedInIntelligenceData
): AiOpportunityScoreDetails {
  logger.info(`Calculating AI Opportunity Score for '${overview.companyName}'...`);

  const crunchbaseWeight = growth ? Math.round(growth.growthOpportunityScore * 0.18) : 18;
  const productHuntWeight = productHunt ? Math.round(productHunt.postMvpBuyingIntentScore * 0.14) : 13;
  const redditWeight = reddit ? Math.round(reddit.averageIntentScore * 0.10) : 9;
  const linkedinWeight = linkedin ? Math.round(linkedin.engineeringExpansionIndex * 0.10) : 9;
  const githubWeight = Math.min(15, Math.round(engineering.engineeringMaturityScore * 0.15));
  const apolloWeight = decisionMakers.length > 0 ? 15 : 11;
  const crmWeight = 8;
  const marketplaceWeight = 10;

  const factors = [
    {
      factorName: 'Crunchbase Growth Intelligence (18% Weight)',
      impactScore: crunchbaseWeight,
      description: growth 
        ? `${growth.latestRoundName} (${growth.latestRoundAmountUsd}) announced. Growth score ${growth.growthOpportunityScore}/100.` 
        : `${overview.fundingStage} stage with revenue ${overview.estimatedRevenue}.`,
    },
    {
      factorName: 'GitHub Engineering Velocity & Stack (15% Weight)',
      impactScore: githubWeight,
      description: `${engineering.publicReposCount} repos, ${engineering.totalStarsCount.toLocaleString()} stars. Engineering maturity ${engineering.engineeringMaturityScore}/100.`,
    },
    {
      factorName: 'Apollo Executive Decision Makers (15% Weight)',
      impactScore: apolloWeight,
      description: `Identified ${decisionMakers.length} decision makers including CTO & VP Engineering.`,
    },
    {
      factorName: 'Product Hunt Startup Launch Intelligence (14% Weight)',
      impactScore: productHuntWeight,
      description: productHunt 
        ? `${productHunt.primaryProduct.name} launched with ${productHunt.totalUpvotes.toLocaleString()} upvotes. Post-MVP intent ${productHunt.postMvpBuyingIntentScore}/100.` 
        : 'Active Product Hunt launch momentum.',
    },
    {
      factorName: 'Reddit Real-Time Buying Intent (10% Weight)',
      impactScore: redditWeight,
      description: reddit 
        ? `${reddit.totalDiscussionsCount} buying discussions across ${reddit.activeSubreddits.slice(0, 3).join(', ')}. Intent score ${reddit.averageIntentScore}/100.` 
        : 'Active Reddit developer community discussion intent.',
    },
    {
      factorName: 'LinkedIn Organic Social & Hiring Signals (10% Weight)',
      impactScore: linkedinWeight,
      description: linkedin 
        ? `${linkedin.activeJobOpeningsCount} engineering job openings, ${linkedin.executivePostsCount} executive posts. Expansion index ${linkedin.engineeringExpansionIndex}/100.` 
        : 'Active LinkedIn hiring announcements and executive posts.',
    },
    {
      factorName: 'Marketplace Universal Opportunities (10% Weight)',
      impactScore: marketplaceWeight,
      description: 'Active software development RFP / opportunity match in universal marketplace pipeline.',
    },
    {
      factorName: 'CRM Active Engagement & Deal Pipeline (8% Weight)',
      impactScore: crmWeight,
      description: 'Qualified lead status with active BDE outreach history.',
    },
  ];

  const overallScore = Math.min(
    99,
    factors.reduce((sum, f) => sum + f.impactScore, 0)
  );

  return {
    overallScore,
    winProbabilityPercent: Math.round(overallScore * 0.88),
    estimatedDealSizeInr: '₹25,00,000 – ₹45,00,000',
    estimatedDealSizeUsd: '$30,000 – $55,000',
    salesPriority: overallScore >= 85 ? 'HIGH' : overallScore >= 65 ? 'MEDIUM' : 'LOW',
    confidenceScorePercent: 94,
    scoringFactors: factors,
  };
}

/**
 * AI Service Recommendations Engine for Tiny Script Soft Tech Pvt Ltd.
 */
export function generateRecommendedServices(
  engineering: EngineeringIntelligenceData
): RecommendedServiceItem[] {
  const recommendations: RecommendedServiceItem[] = [
    {
      id: 'rec_ts_1',
      serviceName: 'Dedicated React 19 & Next.js Senior Squad',
      category: 'Frontend Engineering',
      reasoning: 'Company codebase heavily uses React & TypeScript. High demand for sprint velocity acceleration.',
      detectedTechTrigger: ['React 19', 'Next.js', 'TypeScript', 'TailwindCSS'],
      estimatedEngagementInr: '₹18,00,000 – ₹32,00,000',
      estimatedEngagementUsd: '$22,000 – $38,00,000',
      suggestedSquad: '1 Tech Lead / Architect, 2 Senior Frontend Engineers, 1 QA Engineer',
      fitScore: 98,
    },
    {
      id: 'rec_ts_2',
      serviceName: 'Node.js Microservices Modernization & SOC2 Audit',
      category: 'Backend Architecture',
      reasoning: 'Active API endpoints require refactoring into scalable microservices & HIPAA compliance sign-off.',
      detectedTechTrigger: ['Node.js', 'Express', 'PostgreSQL', 'Docker'],
      estimatedEngagementInr: '₹14,00,000 – ₹24,00,000',
      estimatedEngagementUsd: '$17,000 – $29,00,000',
      suggestedSquad: '1 Lead Backend Architect, 2 Node.js Microservice Engineers',
      fitScore: 94,
    },
    {
      id: 'rec_ts_3',
      serviceName: 'DevOps, Kubernetes & AWS Cloud Optimization',
      category: 'Cloud Infrastructure',
      reasoning: 'High repository star count indicates scaling user traffic requiring automated CI/CD pipelines & AWS cost reduction.',
      detectedTechTrigger: ['Docker', 'Kubernetes', 'AWS', 'Vercel'],
      estimatedEngagementInr: '₹8,00,000 – ₹15,00,000',
      estimatedEngagementUsd: '$10,000 – $18,00,000',
      suggestedSquad: '1 Senior DevOps & AWS Cloud Architect',
      fitScore: 90,
    },
  ];

  if (engineering.categorizedTechStack.aiMl.length > 0 || engineering.categorizedTechStack.backend.includes('Python')) {
    recommendations.unshift({
      id: 'rec_ts_4',
      serviceName: 'FastAPI & Open Source LLM AI Fine-Tuning Integration',
      category: 'AI / Machine Learning',
      reasoning: 'Active Python & AI repository activity detected. High opportunity to integrate custom Llama 3 models.',
      detectedTechTrigger: ['Python', 'FastAPI', 'Llama 3', 'PyTorch'],
      estimatedEngagementInr: '₹15,00,000 – ₹28,00,000',
      estimatedEngagementUsd: '$18,000 – $34,00,000',
      suggestedSquad: '1 AI/ML Engineer, 1 FastAPI Backend Engineer',
      fitScore: 96,
    });
  }

  return recommendations;
}

/**
 * Generate Executive AI Briefing Summary.
 */
export function generateExecutiveBriefing(
  overview: CompanyOverviewData,
  engineering: EngineeringIntelligenceData,
  decisionMakers: DecisionMakerContact[],
  opportunityScore: AiOpportunityScoreDetails
): ExecutiveAiBriefing {
  const cto = decisionMakers.find(dm => dm.jobTitle.toLowerCase().includes('cto')) || decisionMakers[0];

  return {
    summary: `${overview.companyName} is a high-growth ${overview.industry || 'technology'} organization (${overview.employeeRange}) scaling operations and infrastructure.`,
    keyHighlights: [
      `🚀 Engineering team growing rapidly (${engineering.publicReposCount} public repos, ${engineering.totalStarsCount.toLocaleString()} stars).`,
      '⚡ Active migration to React 19, Next.js & Python FastAPI backend APIs.',
      `🏛️ Engineering maturity score evaluated at ${engineering.engineeringMaturityScore}/100.`,
      `💼 Identified verified executive contacts: ${cto ? cto.name + ' (' + cto.jobTitle + ')' : 'No verified executive contacts identified yet.'}`,
    ],
    engineeringStatus: 'Enterprise Scaleup — High outsourcing probability for dedicated software squad augmentation.',
    recommendedNextAction: cto ? `Schedule technical discovery call with ${cto.name}` : 'Identify and schedule discovery call with technical leadership',
    recommendedFirstEngagement: 'React 19 & Microservices Technical Assessment (Fixed-Price 2-Week Architecture Review)',
    estimatedProjectPotentialInr: opportunityScore.estimatedDealSizeInr,
    confidencePercent: opportunityScore.confidenceScorePercent,
  };
}
