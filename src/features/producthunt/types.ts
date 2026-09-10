import { DataSourceOrigin } from '../company360/types';

export type ProductMaker = {
  id: string;
  name: string;
  username: string;
  headline: string; // e.g. 'Founder & CTO @ Acme Health'
  role: 'Founder' | 'Co-Founder' | 'CTO' | 'Lead Engineer' | 'Product Manager' | 'Maker';
  previousLaunchesCount: number;
  twitterUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  source: DataSourceOrigin;
};

export type ProductCommunitySignal = {
  upvotesCount: number; // e.g. 1420
  commentsCount: number; // e.g. 185
  isFeatured: boolean;
  productOfTheDayRank?: number; // e.g. 1 (Product of the Day)
  productOfTheWeekRank?: number;
  trendingScore: number; // 0-100
  launchMomentumScore: number; // 0-100
};

export type ProductHuntPostItem = {
  id: string;
  name: string; // Product Name
  tagline: string;
  description: string;
  launchDate: string; // '2026-02-10'
  productUrl: string; // Product Hunt Post URL
  websiteUrl: string; // Target Company Website URL
  category: 'AI & Machine Learning' | 'Developer Tools' | 'Healthcare SaaS' | 'FinTech' | 'Mobile App' | 'API Platform';
  productStatus: 'Recently Launched (MVP)' | 'Scaling SaaS' | 'Product Market Fit' | 'Beta Access';
  makers: ProductMaker[];
  community: ProductCommunitySignal;
  buyingIntentSignals: {
    signalType: 'POST_MVP_DEVELOPMENT' | 'HIRING_ENGINEERS' | 'API_INTEGRATION_NEEDED' | 'MOBILE_APP_BUILD' | 'CLOUD_SCALING';
    title: string;
    description: string;
    confidenceScore: number; // 0-100
  }[];
  source: DataSourceOrigin;
};

export type ProductHuntIntelligenceData = {
  productHuntOrgId: string;
  primaryProduct: ProductHuntPostItem;
  allLaunches: ProductHuntPostItem[];
  totalUpvotes: number;
  totalComments: number;
  featuredCount: number;
  launchMomentumScore: number; // 0-100
  postMvpBuyingIntentScore: number; // 0-100
  outsourcingProbabilityPercent: number; // 0-100
  estimatedEngineeringTeamSize: string; // '3 – 8 engineers'
  techStackDetected: string[];
  recommendedPitch: string;
  source: DataSourceOrigin;
};

export type ProductHuntRateLimit = {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  formattedReset: string;
};

export type ProductHuntAnalyticsTelemetry = {
  apiCallsToday: number;
  productsIndexed: number;
  makersDiscovered: number;
  totalUpvotesTracked: number;
  cacheHitRatePercent: number;
  averageResponseTimeMs: number;
  recentTrendingProducts: { name: string; tagline: string; upvotes: number; rank: string }[];
};
