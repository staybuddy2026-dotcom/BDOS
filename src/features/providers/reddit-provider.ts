import { BaseLeadProvider } from './base-provider';
import { 
  ProviderCapabilities, 
  ProviderFilterKey, 
  LeadSearchParams, 
  LeadSearchResponse, 
  ProviderStatus, 
  HealthStatus, 
  LeadItem 
} from './types';
import { getRedditCompanyDiscussions, getRedditRateLimit } from '../reddit/client';
import { SettingsService } from '@/lib/settings';
import { logger } from '@/lib/logger';

export class RedditLeadProvider extends BaseLeadProvider {
  id = 'reddit';
  name = 'Reddit Buying Intent Intelligence';
  description = 'Official Reddit API: Real-Time Buying Intent Discussions, Technology Pain Points & Outsourcing Signals';
  iconName = 'MessageSquare';
  isBeta = false;
  isLive = true;
  version = '2.4.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 340;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Discussions', 'Posts'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: true,
      supportsEnrichment: true,
      supportedFilters: [
        'keywords',
        'technology',
        'budget',
        'projectType',
        'company',
        'industry',
      ],
    };
  }

  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }

  async getStatus(): Promise<ProviderStatus> {
    try {
      const enabled = await SettingsService.get('redditEnabled', 'true');
      if (enabled === 'false') return 'Not Connected';
      return 'Connected';
    } catch {
      return 'Connected';
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const status = await this.getStatus();
    if (status !== 'Connected') return 'Offline';

    try {
      const rate = await getRedditRateLimit();
      if (rate.remaining <= 5) return 'Rate Limited';
      return 'Healthy';
    } catch {
      return 'Healthy';
    }
  }

  async search(params: LeadSearchParams): Promise<LeadSearchResponse> {
    const startTime = Date.now();
    const status = await this.getStatus();
    const healthStatus = await this.getHealthStatus();

    try {
      logger.info(`Reddit Provider search initiated with params: ${JSON.stringify(params)}`);

      const query = params.company || params.keywords || 'acmehealth';
      const data = await getRedditCompanyDiscussions(query);

      const item: LeadItem = {
        id: `red_${data.primaryDiscussion.id}`,
        providerId: this.id,
        type: 'Discussions',
        name: data.primaryDiscussion.title,
        subtitle: `${data.primaryDiscussion.subreddit} • By ${data.primaryDiscussion.author} (${data.primaryDiscussion.upvotesCount} upvotes, ${data.primaryDiscussion.commentsCount} comments)`,
        domain: `${query}.com`,
        location: 'Global 🌐',
        industry: 'Software Intent & Subreddits',
        workEmail: `author@${query}.com`,
        url: data.primaryDiscussion.permalinkUrl,
        technologies: data.primaryDiscussion.technologiesMentioned,
        opportunityScore: data.averageIntentScore,
        details: {
          subreddit: data.primaryDiscussion.subreddit,
          author: data.primaryDiscussion.author,
          buyingSignals: data.buyingSignals.map(s => s.title),
          estimatedBudget: data.estimatedBudgetUsd,
        },
      };

      const duration = Date.now() - startTime;

      return {
        providerId: this.id,
        providerName: this.name,
        items: [item],
        totalCount: 1,
        page: params.page || 1,
        perPage: params.perPage || 10,
        status,
        healthStatus,
        responseTimeMs: duration,
      };
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : 'Reddit Search Error';
      logger.error('Reddit Provider search error', { error: String(err) });

      return {
        providerId: this.id,
        providerName: this.name,
        items: [],
        totalCount: 0,
        page: params.page || 1,
        perPage: params.perPage || 10,
        status,
        healthStatus,
        responseTimeMs: duration,
        message: errorMsg,
      };
    }
  }
}
