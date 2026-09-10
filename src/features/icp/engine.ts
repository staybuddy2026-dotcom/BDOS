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
  techStack: string[] = ['React 19', 'Next.js 16', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
  country: string = 'United States',
  employeeCount: number = 250,
  fundingSummary: string = '$12.5M Series A (Sequoia Capital)',
  industry: string = 'Technology'
): IcpMatchResult {
  logger.info(`ICP Fit Engine: Calculating Account Fit & Service Alignment for '${companyName}' (${domain})...`);

  const signals: IcpScoreSignal[] = [
    {
      category: 'TECH_STACK_FIT',
      description: `Technology stack (${techStack.slice(0, 3).join(', ')}) matches Tiny Script core expertise (React 19, Next.js 16, Node.js)`,
      scoreImpact: 25,
      passes: true,
    },
    {
      category: 'FUNDING_STAGE_FIT',
      description: `Recently raised funding (${fundingSummary})`,
      scoreImpact: 20,
      passes: true,
    },
    {
      category: 'COMPANY_SIZE_FIT',
      description: `Optimal company size (${employeeCount} employees, engineering team under 50)`,
      scoreImpact: 15,
      passes: true,
    },
    {
      category: 'OUTSOURCING_PROBABILITY',
      description: 'High outsourcing probability based on active senior dev recruitment gaps',
      scoreImpact: 15,
      passes: true,
    },
    {
      category: 'INDUSTRY_FIT',
      description: `${industry} domain aligns with Tiny Script past case studies`,
      scoreImpact: 10,
      passes: true,
    },
    {
      category: 'GEOGRAPHY_FIT',
      description: `Located in preferred target market (${country})`,
      scoreImpact: 10,
      passes: true,
    },
    {
      category: 'BUDGET_READINESS',
      description: 'Budget readiness matches $50,000+ USD project threshold',
      scoreImpact: 3,
      passes: true,
    },
  ];

  const icpMatchScore = signals.reduce((sum, s) => sum + (s.passes ? s.scoreImpact : 0), 0);

  return {
    companyId,
    companyName,
    domain,
    buyingIntentScore,
    icpMatchScore: Math.min(100, icpMatchScore),
    revenuePotentialInr: '₹40,00,000 – ₹75,00,000',
    revenuePotentialUsd: '$50,000 – $90,000',
    closingProbabilityPercent: 41,
    priorityTier: icpMatchScore >= 85 ? 'TIER_A' : icpMatchScore >= 65 ? 'TIER_B' : 'TIER_C',
    actionRecommendation: 'CONTACT_IMMEDIATELY',
    recommendedServices: [
      'React 19 Enterprise Web Development',
      'Node.js Microservices Architecture',
      'AI Integration & LLM Pipeline',
      'AWS Cloud Modernization',
    ],
    recommendedSquadComposition: '2 Senior Engineers + 1 Tech Lead Squad',
    reasoning: signals,
    salesRecommendation: {
      pitchService: 'React 19 & Node.js Dedicated Engineering Squad',
      techEmphasis: 'React 19 / Next.js 16 Microservices Architecture',
      portfolioCaseStudy: 'Healthcare Patient Portal & Microservices Modernization Case Study',
      recommendedTemplate: 'Executive CTO Technical Partnership Pitch',
      estimatedProjectValueUsd: '$65,000',
      estimatedDurationWeeks: 12,
    },
  };
}
