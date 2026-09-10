import { DataSourceOrigin } from '../company360/types';

export type FundingRound = {
  id: string;
  roundName: string; // 'Seed' | 'Series A' | 'Series B' | 'Series C+' | 'Grant'
  amountUsd: string; // '$18M USD'
  amountInr: string; // '₹150 Cr'
  announcedDate: string; // '2025-11-15'
  leadInvestor: string; // 'Sequoia Capital'
  investors: string[]; // ['Sequoia Capital', 'Accel Partners', 'Y Combinator']
  investorsCount: number;
  valuationUsd?: string;
  source: DataSourceOrigin;
};

export type InvestorItem = {
  id: string;
  name: string;
  type: 'Venture Capital' | 'Corporate VC' | 'Angel Investor' | 'Private Equity' | 'Accelerator';
  isLeadInvestor: boolean;
  totalInvestmentsCount: number;
  websiteUrl?: string;
  source: DataSourceOrigin;
};

export type ExpansionSignalItem = {
  id: string;
  signalType: 'RECENT_FUNDING' | 'RAPID_HIRING' | 'GLOBAL_EXPANSION' | 'PRODUCT_LAUNCH' | 'M_AND_A_ACTIVITY' | 'ENTERPRISE_GROWTH';
  title: string;
  description: string;
  impactScore: number; // 0-100
  detectedDate: string;
};

export type GrowthIntelligenceData = {
  crunchbaseOrgId: string;
  crunchbaseOrgUrl: string;
  companyStage: 'Seed Stage' | 'Early Stage (Series A)' | 'Growth Stage (Series B/C)' | 'Late Stage' | 'Public / Subsidiary';
  foundedYear: number;
  employeeCountGrowthMomPercent: number; // e.g. +42% YoY / MoM
  totalFundingRaisedUsd: string; // '$32M USD'
  totalFundingRaisedInr: string; // '₹265 Cr'
  latestRoundName: string; // 'Series B'
  latestRoundDate: string; // '2025-11-15'
  latestRoundAmountUsd: string; // '$18M USD'
  latestRoundAmountInr: string; // '₹150 Cr'
  estimatedValuationUsd?: string; // '$180M USD'
  leadInvestors: InvestorItem[];
  fundingTimeline: FundingRound[];
  expansionSignals: ExpansionSignalItem[];
  
  // AI Growth Opportunity Scores
  growthOpportunityScore: number; // 0-100
  budgetReadinessScore: number; // 0-100
  outsourcingPotentialScore: number; // 0-100
  enterpriseBuyingReadiness: 'High Enterprise' | 'Growth Ready' | 'Early Adopter';
  estimatedProjectBudgetUsd: string; // '$35,000 – $60,000'
  estimatedProjectBudgetInr: string; // '₹28,00,000 – ₹50,00,000'
  recommendedEngagementModel: string;
  source: DataSourceOrigin;
};

export type CrunchbaseRateLimit = {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  formattedReset: string;
};

export type CrunchbaseProviderAnalytics = {
  apiCallsToday: number;
  companiesIndexed: number;
  fundingRoundsTracked: number;
  totalFundingCalculatedUsd: string;
  cacheHitRatePercent: number;
  averageResponseTimeMs: number;
  recentFundingSignals: { company: string; amount: string; round: string }[];
};
