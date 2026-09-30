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

// ---------------------------------------------------------------------------
// Live LinkedIn data (via the configured scraper provider)
// ---------------------------------------------------------------------------

export type LinkedInErrorCode = 'NOT_CONFIGURED' | 'INVALID_KEY' | 'NO_CREDITS' | 'RATE_LIMIT' | 'ACTOR_UNAVAILABLE' | 'BAD_REQUEST' | 'TIMEOUT' | 'NETWORK' | 'HTTP_ERROR';

export type LinkedInErrorInfo = {
  code: LinkedInErrorCode;
  message: string;
  operation: string;
  at: string;
};

export type LinkedInPostResult = {
  id: string;
  url: string;
  content: string;
  authorName: string;
  authorHeadline?: string;
  authorProfileUrl?: string;
  authorType: 'profile' | 'company';
  /** Parsed from the author's own headline ("CTO at Acme"); undefined when the headline names no company. */
  authorCompany?: string;
  postedAt?: string;
  likes: number;
  comments: number;
  shares: number;
};

export type LinkedInProfileResult = {
  id: string;
  profileUrl: string;
  publicIdentifier?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  about?: string;
  jobTitle?: string;
  companyName?: string;
  companyLinkedinUrl?: string;
  location?: string;
  country?: string;
  email?: string;
  hiring?: boolean;
  openToWork?: boolean;
  followerCount?: number;
  connectionsCount?: number;
  topSkills?: string;
  experience: { title: string; company: string; duration?: string }[];
};

export type LinkedInCompanyResult = {
  id: string;
  name: string;
  linkedinUrl: string;
  universalName?: string;
  website?: string;
  domain?: string;
  tagline?: string;
  description?: string;
  industry?: string;
  specialities: string[];
  employeeCount?: number;
  employeeRange?: string;
  followerCount?: number;
  headquarters?: string;
  foundedYear?: number;
  companyType?: string;
};

export type LinkedInListResponse<T> = {
  items: T[];
  error?: LinkedInErrorInfo;
  /** True when the result came from cache and cost nothing. */
  cached?: boolean;
};

export type LinkedInStatus = {
  configured: boolean;
  enabled: boolean;
  healthy: boolean;
  message: string;
  account?: string;
  monthlyUsageUsd?: number;
  monthlyLimitUsd?: number;
  lastError?: LinkedInErrorInfo;
};
