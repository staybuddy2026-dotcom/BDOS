import { IcpMatchResult, TinyScriptIcpProfile, IcpScoreSignal } from './types';
import { logger } from '@/lib/logger';

export const TINY_SCRIPT_DEFAULT_ICP: TinyScriptIcpProfile = {
  targetEmployeeRange: { min: 20, max: 500 },
  maxInHouseEngTeamSize: 50,
  preferredGeographies: ['United States', 'Germany', 'United Kingdom', 'Canada', 'Australia', 'India'],
  preferredIndustries: ['Healthcare SaaS', 'Fintech', 'Logistics SaaS', 'Enterprise B2B', 'AI / ML'],
  coreTechStack: ['React 19', 'Next.js 16', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Flutter'],
  targetFundingStages: ['Series A', 'Series B', 'Seed Round', 'Y Combinator'],
  minProjectBudgetUsd: 25000,
};

/**
 * AI ICP Matching & Account Fit Engine.
 * Evaluates prospect compatibility against Tiny Script Soft Tech's Ideal Customer Profile.
 */
export function calculateIcpMatchScore(
  companyId: string,
  companyName: string = 'ACME Health Technologies',
  domain: string = 'acmehealth.com',
  buyingIntentScore: number = 91,
  techStack: string[] = [],
  country: string = 'United States',
  employeeCount: number = 100,
  fundingSummary: string = 'Bootstrapped',
  industry: string = 'Technology'
): IcpMatchResult {
  logger.info(`ICP Fit Engine: Calculating Account Fit & Service Alignment for '${companyName}' (${domain})...`);

  // 1. Tech Stack Fit (25 pts)
  const hasCoreTech = techStack.some(t => TINY_SCRIPT_DEFAULT_ICP.coreTechStack.includes(t)) || techStack.length > 0;
  
  // 2. Funding Stage Fit (20 pts)
  const hasGoodFunding = TINY_SCRIPT_DEFAULT_ICP.targetFundingStages.some(f => fundingSummary.includes(f)) || fundingSummary !== 'Bootstrapped';

  // 3. Company Size Fit (15 pts)
  const { min, max } = TINY_SCRIPT_DEFAULT_ICP.targetEmployeeRange;
  const isRightSize = employeeCount >= min && employeeCount <= max;

  // 4. Outsourcing Probability (15 pts)
  // Higher probability if they have good funding but smaller team
  const highOutsourcingProb = employeeCount < 200 && hasGoodFunding;

  // 5. Industry Fit (10 pts)
  const isTargetIndustry = TINY_SCRIPT_DEFAULT_ICP.preferredIndustries.includes(industry) || industry === 'Technology' || industry === 'Software Development';

  // 6. Geography Fit (10 pts)
  const isTargetGeo = TINY_SCRIPT_DEFAULT_ICP.preferredGeographies.includes(country);

  // 7. Budget Readiness (5 pts)
  const budgetReady = hasGoodFunding || employeeCount > 50;

  const signals: IcpScoreSignal[] = [
    {
      category: 'TECH_STACK_FIT',
      description: hasCoreTech 
        ? `Technology stack (${techStack.slice(0, 3).join(', ')}) aligns with Tiny Script expertise.`
        : `Technology stack does not strongly align with core expertise.`,
      scoreImpact: 25,
      passes: hasCoreTech,
    },
    {
      category: 'FUNDING_STAGE_FIT',
      description: hasGoodFunding 
        ? `Recent funding detected (${fundingSummary}).`
        : `Bootstrapped or unknown funding stage.`,
      scoreImpact: 20,
      passes: hasGoodFunding,
    },
    {
      category: 'COMPANY_SIZE_FIT',
      description: isRightSize
        ? `Optimal company size (${employeeCount} employees).`
        : `Company size (${employeeCount} employees) is outside the ideal target range.`,
      scoreImpact: 15,
      passes: isRightSize,
    },
    {
      category: 'OUTSOURCING_PROBABILITY',
      description: highOutsourcingProb
        ? 'High outsourcing probability based on size and funding signals.'
        : 'Average outsourcing probability.',
      scoreImpact: 15,
      passes: highOutsourcingProb,
    },
    {
      category: 'INDUSTRY_FIT',
      description: isTargetIndustry
        ? `${industry} domain aligns with Tiny Script case studies.`
        : `${industry} is a secondary vertical.`,
      scoreImpact: 10,
      passes: isTargetIndustry,
    },
    {
      category: 'GEOGRAPHY_FIT',
      description: isTargetGeo
        ? `Located in preferred target market (${country}).`
        : `Located outside primary geographic targets (${country}).`,
      scoreImpact: 10,
      passes: isTargetGeo,
    },
    {
      category: 'BUDGET_READINESS',
      description: budgetReady
        ? 'Budget readiness indicates capacity for $25k+ engagements.'
        : 'Budget readiness is uncertain.',
      scoreImpact: 5,
      passes: budgetReady,
    },
  ];

  const icpMatchScore = signals.reduce((sum, s) => sum + (s.passes ? s.scoreImpact : 0), 0);
  
  // Dynamic Revenue Potential based on size and funding
  let baseUsd = 25000;
  if (employeeCount > 100) baseUsd += 15000;
  if (employeeCount > 500) baseUsd += 20000;
  if (hasGoodFunding) baseUsd += 10000;
  
  const maxUsd = baseUsd + 40000;
  
  // INR roughly 83x USD
  const baseInr = Math.floor(baseUsd * 83 / 100000) * 100000;
  const maxInr = Math.floor(maxUsd * 83 / 100000) * 100000;
  
  // Dynamic closing probability based on ICP match
  const closingProb = Math.max(5, Math.floor(icpMatchScore * 0.45));

  return {
    companyId,
    companyName,
    domain,
    buyingIntentScore,
    icpMatchScore: Math.min(100, icpMatchScore),
    revenuePotentialInr: `₹${(baseInr/100000).toFixed(0)},00,000 – ₹${(maxInr/100000).toFixed(0)},00,000`,
    revenuePotentialUsd: `$${baseUsd.toLocaleString()} – $${maxUsd.toLocaleString()}`,
    closingProbabilityPercent: closingProb,
    priorityTier: icpMatchScore >= 75 ? 'TIER_A' : icpMatchScore >= 50 ? 'TIER_B' : 'TIER_C',
    actionRecommendation: icpMatchScore >= 75 ? 'CONTACT_IMMEDIATELY' : 'NURTURE_SEQUENCE',
    recommendedServices: [
      'React 19 Enterprise Web Development',
      'Node.js Microservices Architecture',
      'AI Integration & LLM Pipeline'
    ],
    recommendedSquadComposition: employeeCount > 200 ? '3 Senior Engineers + 1 Tech Lead Squad' : '2 Engineers (Full-Stack)',
    reasoning: signals,
    salesRecommendation: {
      pitchService: 'Dedicated Engineering Squad',
      techEmphasis: techStack.slice(0,2).join(' / ') || 'React 19 / Next.js',
      portfolioCaseStudy: `${industry} Modernization Case Study`,
      recommendedTemplate: 'Executive CTO Technical Partnership Pitch',
      estimatedProjectValueUsd: '$65,000',
      estimatedDurationWeeks: 12,
    },
  };
}
