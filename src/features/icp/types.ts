export type IcpScoreCategory = 
  | 'TECH_STACK_FIT' 
  | 'COMPANY_SIZE_FIT' 
  | 'INDUSTRY_FIT' 
  | 'GEOGRAPHY_FIT' 
  | 'FUNDING_STAGE_FIT' 
  | 'OUTSOURCING_PROBABILITY' 
  | 'BUDGET_READINESS';

export type IcpScoreSignal = {
  category: IcpScoreCategory;
  description: string;
  scoreImpact: number;
  passes: boolean;
};

export type IcpMatchResult = {
  companyId: string;
  companyName: string;
  domain: string;
  buyingIntentScore: number; // 0-100
  icpMatchScore: number;     // 0-100
  revenuePotentialInr: string; // e.g. "₹40,00,000 – ₹75,00,000"
  revenuePotentialUsd: string; // e.g. "$50,000 – $90,000"
  closingProbabilityPercent: number; // e.g. 41%
  priorityTier: 'TIER_A' | 'TIER_B' | 'TIER_C';
  actionRecommendation: 'CONTACT_IMMEDIATELY' | 'SCHEDULE_DEMO_THIS_WEEK' | 'NURTURE_SEQUENCE';
  recommendedServices: string[];
  recommendedSquadComposition: string;
  reasoning: IcpScoreSignal[];
  salesRecommendation: {
    pitchService: string;
    techEmphasis: string;
    portfolioCaseStudy: string;
    recommendedTemplate: string;
    estimatedProjectValueUsd: string;
    estimatedDurationWeeks: number;
  };
};

export type TinyScriptIcpProfile = {
  targetEmployeeRange: { min: number; max: number };
  maxInHouseEngTeamSize: number;
  preferredGeographies: string[];
  preferredIndustries: string[];
  coreTechStack: string[];
  targetFundingStages: string[];
  minProjectBudgetUsd: number;
};
