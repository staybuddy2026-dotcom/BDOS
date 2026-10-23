/** GitHub engineering signals for a company (public GitHub REST API). Safe to import in the browser. */

export type GitHubErrorCode = 'NOT_FOUND' | 'RATE_LIMIT' | 'INVALID_TOKEN' | 'NETWORK' | 'HTTP_ERROR' | 'BAD_INPUT';

export type GitHubError = { code: GitHubErrorCode; message: string };

/** Requests left this hour. Without a token GitHub allows 60 per hour per IP; with one, 5,000. */
export type GitHubRateInfo = { limit: number; remaining: number; resetAt: string; withToken: boolean };

/** An organization in a search list, to pick from. */
export type GitHubOrgCandidate = {
  login: string;
  name?: string;
  avatarUrl: string;
  htmlUrl: string;
  description?: string;
  website?: string;
  /** The organization's website is the domain that was searched for. */
  websiteMatches?: boolean;
};

export type GitHubRepoSummary = {
  name: string;
  htmlUrl: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  pushedAt: string;
  topics: string[];
};

export type GitHubOrgInsights = {
  login: string;
  type: 'Organization' | 'User';
  name: string;
  avatarUrl: string;
  htmlUrl: string;
  description?: string;
  /** Company website from the GitHub profile (the "blog" field), as a bare domain. */
  domain?: string;
  website?: string;
  location?: string;
  email?: string;
  twitter?: string;
  publicRepos: number;
  followers: number;
  createdAt: string;
  /** Own repositories looked at (not forks or archived), out of the most recently updated 100. */
  reposAnalyzed: number;
  /** Share of those repositories per main language, largest first. */
  languages: { name: string; repos: number; percent: number }[];
  /** Repository topics used most often (frameworks, tools, domains). */
  topics: { name: string; repos: number }[];
  activity: { updatedLast30Days: number; updatedLast90Days: number; lastPushAt?: string; totalStars: number };
  topRepos: GitHubRepoSummary[];
  recentRepos: GitHubRepoSummary[];
  /** Catalog services whose stack shows up in their languages or topics. */
  matchedServices: { name: string; matchedTech: string[]; fromInr: string; fromUsd: string; model: string }[];
  /** Short plain-language reading of the evidence above. */
  signals: string[];
  fetchedAt: string;
};

export type GitHubSearchResult = {
  insights?: GitHubOrgInsights;
  /** Several possible organizations, or none whose website matched: the user picks one. */
  candidates?: GitHubOrgCandidate[];
  note?: string;
  error?: GitHubError;
  rate?: GitHubRateInfo;
};
