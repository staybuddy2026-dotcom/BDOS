import { DataSourceOrigin } from '../company360/types';

export type LinkedInPostItem = {
  id: string;
  authorName: string;
  authorTitle: string; // e.g. 'CTO & Co-Founder @ Acme Health'
  postType: 'Hiring Announcement' | 'AI Transformation' | 'Cloud Migration' | 'Funding Celebration' | 'Product Expansion' | 'Partnership';
  contentSnippet: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  postUrl: string;
  publishedDate: string; // '2026-02-18'
  buyingIntentScore: number; // 0-100
  technologiesMentioned: string[];
  source: DataSourceOrigin;
};

export type LinkedInJobOpeningItem = {
  id: string;
  title: string; // e.g. 'Senior React 19 & Node.js Squad Lead'
  department: 'Software Engineering' | 'AI / Machine Learning' | 'Cloud / DevOps' | 'Product Management';
  location: string; // 'Remote (US/Global)'
  employmentType: 'Full-time' | 'Contract / Squad';
  technologiesRequired: string[];
  postedDate: string; // '2026-02-12'
  urgencyLevel: 'High Urgency' | 'Moderate' | 'Pipeline';
};

export type LinkedInBuyingSignalItem = {
  id: string;
  signalType: 
    | 'SCALING_ENGINEERING_TEAM' 
    | 'LOOKING_FOR_PARTNER' 
    | 'AI_TRANSFORMATION' 
    | 'CLOUD_MIGRATION' 
    | 'LEGACY_MODERNIZATION' 
    | 'REACT_MIGRATION';
  title: string;
  description: string;
  confidenceScore: number; // 0-100
  detectedFrom: string; // e.g. 'CTO LinkedIn Post' or 'Job Opening'
};

export type LinkedInIntelligenceData = {
  companyDomain: string;
  companyName: string;
  totalEmployeesOnLinkedin: number;
  activeJobOpeningsCount: number;
  executivePostsCount: number;
  socialEngagementScore: number; // 0-100
  engineeringExpansionIndex: number; // 0-100
  outsourcingProbabilityPercent: number; // 0-100
  primaryPost: LinkedInPostItem;
  recentPosts: LinkedInPostItem[];
  jobOpenings: LinkedInJobOpeningItem[];
  buyingSignals: LinkedInBuyingSignalItem[];
  recommendedPitch: string;
  source: DataSourceOrigin;
};

export type LinkedInRateLimit = {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  formattedReset: string;
};

export type LinkedInAnalyticsTelemetry = {
  apiCallsToday: number;
  executivePostsIndexed: number;
  hiringAnnouncementsFound: number;
  aiTransformationSignals: number;
  averageEngagementScore: number;
  cacheHitRatePercent: number;
  averageResponseTimeMs: number;
  topHiringRoleCategories: { category: string; openingsCount: number; urgencyScore: number }[];
};
