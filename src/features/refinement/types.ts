export type SignalCategory =
  | 'FUNDING'
  | 'HIRING'
  | 'GITHUB_ACTIVITY'
  | 'REDDIT_BUYING_INTENT'
  | 'PRODUCT_HUNT_LAUNCH'
  | 'EXECUTIVE_CHANGE';

export type LeadExplanationSignal = {
  category: SignalCategory;
  description: string;
  impactScore: number;
  verifiedAt: string;
};

export type LeadExplanation = {
  companyId: string;
  companyName: string;
  domain: string;
  buyingScore: number;
  whyThisLeadSummary: string;
  signals: LeadExplanationSignal[];
  expectedBudgetInr: string;
  expectedBudgetUsd: string;
  expectedTechStack: string[];
  expectedTeamSize: string;
  expectedTimelineWeeks: number;
  probabilityOfClosingPercent: number;
  recommendedAction: string;
  timelineRecommendation: 'CONTACT_WITHIN_24_HOURS' | 'SCHEDULE_DEMO_THIS_WEEK' | 'NURTURE_SEQUENCE';
};

export type OmniChannelOutreachPackage = {
  id: string;
  companyName: string;
  targetContactName: string;
  targetContactTitle: string;
  coldEmail: { subject: string; body: string };
  linkedInInMail: { subject: string; message: string };
  whatsAppMessage: string;
  followupSequence: { day: number; message: string }[];
  proposalIntro: string;
  meetingAgenda: string[];
};

export type AdvancedFilterParams = {
  query?: string;
  countries?: string[];
  employeeRanges?: string[];
  fundingTypes?: string[];
  techStacks?: string[];
  hiringOnly?: boolean;
  minBudgetInr?: number;
  tierFilter?: 'ALL' | 'TIER_A' | 'TIER_B' | 'TIER_C';
};

export type UniversalSearchResultItem = {
  companyId: string;
  companyName: string;
  domain: string;
  country: string;
  employeeCount: number;
  buyingScore: number;
  icpScore?: number;
  tier: 'TIER_A' | 'TIER_B' | 'TIER_C';
  primaryTechStack: string[];
  fundingSummary: string;
  hiringSummary: string;
  matchedProviders: ('apollo' | 'github' | 'crunchbase' | 'producthunt' | 'reddit' | 'linkedin')[];
};

export type MorningCommandMetrics = {
  topCompanies: UniversalSearchResultItem[];
  fundingTodayCount: number;
  hiringTodayCount: number;
  newCtosCount: number;
  githubActiveReposCount: number;
  hotRedditDiscussionsCount: number;
  newProductHuntLaunchesCount: number;
};
