'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { 
  searchGitHubRepositories, 
  searchGitHubOrganizations, 
  getGitHubRateLimit 
} from './client';
import { 
  analyzeGitHubRepositoryAi, 
  analyzeGitHubOrganizationAi 
} from './intelligence';
import { 
  GitHubRepo, 
  GitHubOrg, 
  GitHubRateLimit,
  GitHubWatchlistItem, 
  GitHubSavedSearch, 
  GitHubProviderAnalytics 
} from './types';
import { createCrmDealFromMarketplaceOpportunity } from '@/features/crm/actions';
import { sendMarketplaceProjectToReviewQueue } from '@/features/marketplace/actions';
import { safeRevalidatePath } from '@/lib/revalidate';

// In-Memory GitHub Watchlist Store
const watchlistStore: GitHubWatchlistItem[] = [
  {
    id: 'wl_gh_1',
    targetType: 'org',
    targetName: 'acme-health',
    htmlUrl: 'https://github.com/acme-health',
    lastActivity: '12 mins ago',
    newReleases: 3,
    majorChanges: 'Migrated backend REST API to TypeScript Node.js microservices',
    techUpdates: ['React 19', 'TypeScript', 'Node.js', 'HIPAA'],
    addedDate: '2026-07-20',
  },
  {
    id: 'wl_gh_2',
    targetType: 'repo',
    targetName: 'logistics-global/flutter-fleet-logistics-app',
    htmlUrl: 'https://github.com/logistics-global/flutter-fleet-logistics-app',
    lastActivity: '1 hour ago',
    newReleases: 1,
    majorChanges: 'Added offline GPS map caching & Bluetooth driver dispatching',
    techUpdates: ['Flutter', 'Dart', 'Firebase'],
    addedDate: '2026-07-22',
  },
];

// In-Memory GitHub Saved Searches Store
const savedSearchesStore: GitHubSavedSearch[] = [
  {
    id: 'ss_gh_1',
    name: 'React 19 USA Companies',
    category: 'High Intent',
    tech: 'React',
    starsMin: 500,
    language: 'TypeScript',
    createdDate: '2026-07-20',
    isShared: true,
  },
  {
    id: 'ss_gh_2',
    name: 'AI Startups & Local LLMs',
    category: 'AI / ML',
    tech: 'Python',
    starsMin: 1000,
    language: 'Python',
    createdDate: '2026-07-22',
    isShared: true,
  },
  {
    id: 'ss_gh_3',
    name: 'Flutter Mobile Fleet Projects',
    category: 'Mobile Squad',
    tech: 'Flutter',
    starsMin: 200,
    language: 'Dart',
    createdDate: '2026-07-25',
    isShared: false,
  },
];

/**
 * Fetch GitHub Provider Workspace data (Repositories, Organizations, Rate Limits, Watchlist, Saved Searches).
 */
export async function getGitHubWorkspaceData(params?: {
  technology?: string;
  query?: string;
  language?: string;
  starsMin?: number;
}): Promise<{
  repos: GitHubRepo[];
  orgs: GitHubOrg[];
  rateLimit: GitHubRateLimit;
  watchlist: GitHubWatchlistItem[];
  savedSearches: GitHubSavedSearch[];
  totalReposCount: number;
  totalOrgsCount: number;
}> {
  try {
    await AuthService.verifySession();
    logger.info(`Fetching GitHub Provider Workspace Data (Tech: ${params?.technology || 'ALL'})...`);

    const [reposRes, orgsRes, rateLimit, watchlist, savedSearches] = await Promise.all([
      searchGitHubRepositories({
        technology: params?.technology,
        query: params?.query,
        language: params?.language,
        starsMin: params?.starsMin,
        perPage: 12,
      }),
      searchGitHubOrganizations({
        query: params?.technology || params?.query,
        perPage: 6,
      }),
      getGitHubRateLimit(),
      Promise.resolve(watchlistStore),
      Promise.resolve(savedSearchesStore),
    ]);

    return {
      repos: reposRes.repos,
      orgs: orgsRes.orgs,
      rateLimit,
      watchlist,
      savedSearches,
      totalReposCount: reposRes.totalCount,
      totalOrgsCount: orgsRes.totalCount,
    };
  } catch (err: unknown) {
    logger.error('Failed to query GitHub Workspace data', { error: String(err) });
    throw new AppError('GitHub Workspace query failed.', 500);
  }
}

/**
 * Analyze a GitHub Repository using AI Engineering Intelligence.
 */
export async function analyzeGitHubRepoAction(repo: GitHubRepo) {
  return await analyzeGitHubRepositoryAi(repo);
}

/**
 * Analyze a GitHub Organization using AI Engineering Intelligence.
 */
export async function analyzeGitHubOrgAction(org: GitHubOrg) {
  return await analyzeGitHubOrganizationAi(org);
}

/**
 * Add / Remove item from BDE Watchlist.
 */
export async function toggleGitHubWatchlistAction(item: Omit<GitHubWatchlistItem, 'id' | 'addedDate'>) {
  try {
    await AuthService.verifySession();
    const existingIdx = watchlistStore.findIndex(w => w.targetName === item.targetName);

    if (existingIdx !== -1) {
      watchlistStore.splice(existingIdx, 1);
      safeRevalidatePath('/github');
      return { success: true, isWatchlisted: false, message: `Removed '${item.targetName}' from BDE Watchlist.` };
    }

    const newItem: GitHubWatchlistItem = {
      id: `wl_gh_${Date.now()}`,
      addedDate: new Date().toISOString().split('T')[0],
      ...item,
    };

    watchlistStore.unshift(newItem);
    safeRevalidatePath('/github');
    return { success: true, isWatchlisted: true, message: `Added '${item.targetName}' to BDE Watchlist.` };
  } catch (err: unknown) {
    logger.error(`Failed to toggle watchlist for ${item.targetName}`, { error: String(err) });
    throw new AppError('Watchlist update failed.', 500);
  }
}

/**
 * Create CRM Lead directly from GitHub Repository or Organization.
 */
export async function createCrmLeadFromGitHubAction(data: {
  name: string;
  orgName: string;
  technologies: string[];
  htmlUrl: string;
}) {
  try {
    await AuthService.verifySession();
    logger.info(`Creating CRM Lead from GitHub Engineering Intelligence: '${data.name}'...`);

    const result = await createCrmDealFromMarketplaceOpportunity({
      projectTitle: `GitHub Lead: ${data.name} (${data.orgName})`,
      clientCountry: 'Global 🌐',
      budget: '$25,000 – $40,000',
      technologyStack: data.technologies,
      projectUrl: data.htmlUrl,
    });

    return {
      success: true,
      message: `Created Enterprise CRM Lead for '${data.name}' with stage 'Qualified Lead'`,
      dealId: result.dealId,
    };
  } catch (err: unknown) {
    logger.error('Failed to create CRM lead from GitHub provider', { error: String(err) });
    throw new AppError('Failed to create CRM lead.', 500);
  }
}

/**
 * Dispatch GitHub Engineering Intelligence to Review Queue.
 */
export async function sendGitHubToReviewQueueAction(data: {
  name: string;
  orgName: string;
  technologies: string[];
  htmlUrl: string;
  description: string;
}) {
  try {
    await AuthService.verifySession();
    const result = await sendMarketplaceProjectToReviewQueue({
      title: `GitHub Prospect: ${data.name}`,
      clientName: data.orgName,
      postUrl: data.htmlUrl,
      budget: '$25,000 – $40,000',
      techStack: data.technologies,
      description: data.description,
    });

    return {
      success: true,
      created: result.created,
      message: result.created ? `Dispatched '${data.name}' to Review Queue!` : `'${data.name}' is already in Review Queue.`,
    };
  } catch (err: unknown) {
    logger.error('Failed to send GitHub project to Review Queue', { error: String(err) });
    throw new AppError('Failed to send to Review Queue.', 500);
  }
}

/**
 * Fetch GitHub Provider Analytics.
 */
export async function getGitHubProviderAnalyticsAction(): Promise<GitHubProviderAnalytics> {
  try {
    await AuthService.verifySession();
    return {
      apiCallsToday: 480,
      organizationsIndexed: 142,
      repositoriesIndexed: 680,
      cacheHitRatePercent: 88,
      averageResponseTimeMs: 240,
      aiQualifiedResults: 54,
      repositoryTrends: [
        { name: 'react-enterprise-saas-core', growth: '+240 Stars / wk' },
        { name: 'python-llm-legal-analytics', growth: '+410 Stars / wk' },
        { name: 'flutter-fleet-logistics-app', growth: '+180 Stars / wk' },
      ],
      technologyTrends: [
        { tech: 'TypeScript / React 19', percentage: 42 },
        { tech: 'Python / AI / LLMs', percentage: 28 },
        { tech: 'Flutter / Mobile', percentage: 18 },
        { tech: 'Node.js / DevOps', percentage: 12 },
      ],
    };
  } catch (err: unknown) {
    logger.error('Failed to query GitHub provider analytics', { error: String(err) });
    throw new AppError('Failed to query provider analytics.', 500);
  }
}
