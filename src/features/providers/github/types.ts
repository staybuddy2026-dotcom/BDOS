export type GitHubOrg = {
  id: number;
  login: string;
  name: string;
  description: string;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  location: string;
  email: string;
  blog: string;
  created_at: string;
  primaryTech: string[];
  activityLevel: 'Very High' | 'High' | 'Moderate' | 'Low';
  aiBusinessScore: number; // 0-100
  engineeringMaturity: 'Enterprise Grade' | 'Scaleup Architecture' | 'Growth Stage' | 'Early Stage';
  openSourceInfluence: 'High' | 'Moderate' | 'Low';
};

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
    type: string;
  };
  html_url: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  created_at: string;
  topics: string[];
  license: { key: string; name: string } | null;
  archived: boolean;
  score: number;
  technologies: string[];
  
  // AI Engineering Intelligence
  aiOpportunityScore: number; // 0-100
  outsourcingProbability: 'High' | 'Medium' | 'Low';
  hiringSignalScore: number; // 0-100
  growthPotential: 'Exponential' | 'High Growth' | 'Stable' | 'Niche';
  detectedOpportunities: string[];
};

export type GitHubRateLimit = {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  formattedReset: string;
};

export type GitHubWatchlistItem = {
  id: string;
  targetType: 'org' | 'repo' | 'topic';
  targetName: string;
  htmlUrl: string;
  lastActivity: string;
  newReleases: number;
  majorChanges: string;
  techUpdates: string[];
  addedDate: string;
};

export type GitHubSavedSearch = {
  id: string;
  name: string;
  category: string;
  tech: string;
  starsMin: number;
  language: string;
  createdDate: string;
  isShared: boolean;
};

export type GitHubAiIntelligence = {
  repositoryId: number;
  repositoryName: string;
  organizationName: string;
  technologyStackAnalysis: {
    primaryLanguage: string;
    frameworks: string[];
    cloudInfrastructure: string[];
    aiMlComponents: string[];
  };
  engineeringMaturityScore: number; // 0-100
  growthPotential: string;
  aiOpportunityScore: number; // 0-100
  outsourcingProbability: 'High' | 'Medium' | 'Low';
  hiringSignalScore: number; // 0-100
  digitalTransformationScore: number; // 0-100
  enterpriseReadiness: 'Enterprise' | 'Scaleup' | 'Growth' | 'Early';
  detectedOpportunities: string[];
  recommendedPitchStrategy: string;
  estimatedDevHoursNeeded: number;
  potentialDealSize: string;
};

export type GitHubProviderAnalytics = {
  apiCallsToday: number;
  organizationsIndexed: number;
  repositoriesIndexed: number;
  cacheHitRatePercent: number;
  averageResponseTimeMs: number;
  aiQualifiedResults: number;
  repositoryTrends: { name: string; growth: string }[];
  technologyTrends: { tech: string; percentage: number }[];
};
