import { DataSourceOrigin } from '../company360/types';

export type RedditPostItem = {
  id: string;
  title: string;
  subreddit: 'r/reactjs' | 'r/node' | 'r/webdev' | 'r/startups' | 'r/SaaS' | 'r/artificial' | 'r/MachineLearning' | 'r/devops' | 'r/aws' | 'r/flutterdev';
  author: string; // e.g. 'u/techlead_boston'
  bodySnippet: string;
  upvotesCount: number;
  commentsCount: number;
  permalinkUrl: string;
  createdDate: string; // '2026-02-14'
  buyingIntentScore: number; // 0-100
  technologiesMentioned: string[];
};

export type RedditBuyingSignalItem = {
  id: string;
  signalType: 
    | 'LOOKING_FOR_AGENCY' 
    | 'NEED_REACT_DEVS' 
    | 'OUTSOURCING_DEV' 
    | 'AI_LLM_INTEGRATION' 
    | 'CLOUD_MIGRATION' 
    | 'LEGACY_MODERNIZATION' 
    | 'FLUTTER_MOBILE';
  title: string;
  description: string;
  intentScore: number; // 0-100
  urgencyLevel: 'Immediate (1-2 Wks)' | 'Short Term (1 Mo)' | 'Planning Stage';
};

export type RedditIntelligenceData = {
  companyDomain: string;
  totalDiscussionsCount: number;
  averageIntentScore: number; // 0-100
  technicalMatchScore: number; // 0-100
  estimatedBudgetInr: string; // '₹20,00,000 – ₹40,00,000'
  estimatedBudgetUsd: string; // '$25,000 – $50,00,000'
  expectedSalesCycle: string; // '1 – 2 Weeks'
  outsourcingUrgency: 'High Urgency' | 'Moderate' | 'Exploratory';
  primaryDiscussion: RedditPostItem;
  recentDiscussions: RedditPostItem[];
  buyingSignals: RedditBuyingSignalItem[];
  activeSubreddits: string[];
  recommendedPitch: string;
  source: DataSourceOrigin;
};

export type RedditRateLimit = {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  formattedReset: string;
};

export type RedditAnalyticsTelemetry = {
  apiCallsToday: number;
  buyingSignalsFound: number;
  companiesIdentified: number;
  discussionsProcessed: number;
  averageIntentScore: number;
  cacheHitRatePercent: number;
  averageResponseTimeMs: number;
  topTrendingTechnologies: { technology: string; mentionsCount: number; averageIntent: number }[];
};
