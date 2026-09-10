import type { GrowthIntelligenceData } from '../crunchbase/types';
import type { ProductHuntIntelligenceData } from '../producthunt/types';
import type { RedditIntelligenceData } from '../reddit/types';
import type { LinkedInIntelligenceData } from '../linkedin/types';
import type { BuyingReadinessDetails } from '../prioritization/types';
import type { OutreachMessageDraft } from '../outreach/types';

export type DataSourceOrigin = 'Apollo' | 'GitHub' | 'Crunchbase' | 'Product Hunt' | 'Reddit' | 'LinkedIn' | 'CRM' | 'AI' | 'Cross-Provider';

export type DataProvenanceField<T> = {
  value: T;
  source: DataSourceOrigin;
  lastUpdated: string;
  confidenceScore?: number; // 0-100
};

export type DecisionMakerContact = {
  id: string;
  name: string;
  jobTitle: string;
  department: 'Engineering' | 'Executive' | 'Product' | 'Operations' | 'Sales';
  seniority: 'C-Level' | 'VP' | 'Director' | 'Manager' | 'Lead';
  email: string;
  emailStatus: 'Verified' | 'Unverified' | 'Extrapolated';
  linkedinUrl: string;
  source: DataSourceOrigin;
};

export type CategorizedTechStack = {
  frontend: string[];
  backend: string[];
  mobile: string[];
  devopsCloud: string[];
  aiMl: string[];
  databases: string[];
};

export type EngineeringIntelligenceData = {
  githubOrgLogin: string;
  githubOrgUrl: string;
  publicReposCount: number;
  activeReposCount: number;
  totalStarsCount: number;
  totalForksCount: number;
  totalContributorsCount: number;
  primaryLanguages: string[];
  categorizedTechStack: CategorizedTechStack;
  engineeringMaturityScore: number; // 0-100
  hiringSignalScore: number; // 0-100
  recentActivitySummary: string;
  topRepositories: {
    name: string;
    fullName: string;
    htmlUrl: string;
    language: string;
    stars: number;
    updatedAt: string;
    aiScore: number;
  }[];
  source: DataSourceOrigin;
};

export type CompanyOverviewData = {
  companyId: string;
  companyName: string;
  domain: string;
  websiteUrl: string;
  industry: string;
  headquarters: string;
  employeeCount: number;
  employeeRange: string;
  estimatedRevenue: string;
  fundingStage: string;
  fundingTotal: string;
  companyDescription: string;
  logoUrl?: string;
  linkedinPageUrl?: string;
  source: DataSourceOrigin;
};

export type AiOpportunityScoreDetails = {
  overallScore: number; // 0-100
  winProbabilityPercent: number; // 0-100
  estimatedDealSizeInr: string; // e.g. "₹25,00,000 – ₹45,00,000"
  estimatedDealSizeUsd: string; // e.g. "$30,000 – $55,000"
  salesPriority: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScorePercent: number; // 0-100
  scoringFactors: {
    factorName: string;
    impactScore: number; // +1 to +30
    description: string;
  }[];
};

export type RecommendedServiceItem = {
  id: string;
  serviceName: string;
  category: string;
  reasoning: string;
  detectedTechTrigger: string[];
  estimatedEngagementInr: string;
  estimatedEngagementUsd: string;
  suggestedSquad: string;
  fitScore: number; // 0-100
};

export type CompanyTimelineEvent = {
  id: string;
  timestamp: string;
  eventType: 
    | 'APOLLO_IMPORTED'
    | 'GITHUB_MATCHED'
    | 'REPO_UPDATED'
    | 'DECISION_MAKER_FOUND'
    | 'CRM_MEETING_LOGGED'
    | 'PROPOSAL_SENT'
    | 'REVIEW_QUEUE_ADDED'
    | 'DEAL_WON';
  title: string;
  description: string;
  source: DataSourceOrigin;
};

export type ExecutiveAiBriefing = {
  summary: string;
  keyHighlights: string[];
  engineeringStatus: string;
  recommendedNextAction: string;
  recommendedFirstEngagement: string;
  estimatedProjectPotentialInr: string;
  confidencePercent: number;
};

export type Company360Profile = {
  companyId: string;
  domain: string;
  overview: CompanyOverviewData;
  decisionMakers: DecisionMakerContact[];
  engineering: EngineeringIntelligenceData;
  growth?: GrowthIntelligenceData;
  productHunt?: ProductHuntIntelligenceData;
  reddit?: RedditIntelligenceData;
  linkedin?: LinkedInIntelligenceData;
  buyingReadiness?: BuyingReadinessDetails;
  outreachHistory?: OutreachMessageDraft[];
  engagementScore?: number;
  opportunityScoring: AiOpportunityScoreDetails;
  recommendedServices: RecommendedServiceItem[];
  timeline: CompanyTimelineEvent[];
  executiveBriefing: ExecutiveAiBriefing;
  crmActivity: {
    crmAccountId?: string;
    currentStage: string;
    assignedBde: string;
    totalDealsCount: number;
    openDealsValueInr: string;
    lastContactDate?: string;
  };
  provenance: Record<string, DataSourceOrigin>;
};

export type Company360SearchResult = {
  companyId: string;
  companyName: string;
  domain: string;
  industry: string;
  headquarters: string;
  employeeCount: number;
  opportunityScore: number;
  engineeringMaturity: number;
  sourcesAvailable: DataSourceOrigin[];
};
