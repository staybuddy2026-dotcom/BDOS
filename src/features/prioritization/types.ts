import { DataSourceOrigin } from '../company360/types';

export type PriorityTier = 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'MONITOR' | 'ARCHIVE';

export type NextBestActionType = 
  | 'LINKEDIN_CONNECT' 
  | 'PERSONALIZED_EMAIL' 
  | 'DISCOVERY_CALL' 
  | 'GENERATE_PROPOSAL' 
  | 'REVIEW_QUEUE_PUSH' 
  | 'BDE_ASSIGN' 
  | 'MONITOR_ACTIVITY';

export type NextBestAction = {
  id: string;
  actionType: NextBestActionType;
  title: string;
  description: string;
  recommendedAssignee: string; // e.g. 'Senior BDE'
  executionPriority: 'Urgent Today' | 'Within 24 Hours' | 'This Week';
  ctaLabel: string;
  targetUrl?: string;
};

export type AccountBuyingSignal = {
  id: string;
  provider: DataSourceOrigin | 'Marketplace';
  title: string;
  description: string;
  impactScore: number;
  detectedDate: string;
};

export type BuyingReadinessDetails = {
  companyId: string;
  domain: string;
  companyName: string;
  buyingReadinessScore: number; // 0-100
  priorityTier: PriorityTier;
  winProbabilityPercent: number; // 0-100
  estimatedDealValueInr: string; // '₹25,00,000 – ₹45,00,000'
  estimatedDealValueUsd: string; // '$30,000 – $55,000'
  expectedSalesCycle: string; // '1 – 2 Weeks'
  technicalMatchScore: number; // 0-100
  budgetConfidence: number; // 0-100
  growthVelocityScore: number; // 0-100
  engineeringExpansionIndex: number; // 0-100
  executiveEngagementScore: number; // 0-100
  nextBestActions: NextBestAction[];
  keySignals: AccountBuyingSignal[];
  recommendedPitch: string;
  suggestedSquad: string; // e.g. '2-Senior React 19 + Node.js Squad'
  lastEvaluatedDate: string;
};

export type PrioritizationDashboardTelemetry = {
  companiesToContactToday: number;
  highPriorityAccountsCount: number;
  estimatedPipelineValueUsd: string;
  estimatedPipelineValueInr: string;
  predictedMonthlyRevenue: string;
  averageBuyingScore: number;
  aiWinProbabilityPercent: number;
  averageResponseProbabilityPercent: number;
  todaysRecommendedTasksCount: number;
};
