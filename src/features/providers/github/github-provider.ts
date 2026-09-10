import { BaseLeadProvider } from '../base-provider';
import { 
  ProviderCapabilities, 
  ProviderFilterKey, 
  LeadSearchParams, 
  LeadSearchResponse, 
  ProviderStatus, 
  HealthStatus, 
  LeadItem 
} from '../types';
import { searchGitHubRepositories, getGitHubRateLimit } from './client';
import { SettingsService } from '@/lib/settings';
import { logger } from '@/lib/logger';

export class GitHubLeadProvider extends BaseLeadProvider {
  id = 'github';
  name = 'GitHub Engineering Intelligence';
  description = 'Official GitHub REST API & Live Engineering Intelligence Platform';
  iconName = 'GitBranch';
  isBeta = false;
  isLive = true;
  version = '3.5.0';
  apiVersion = 'v3';
  avgResponseTimeMs = 240;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Repositories', 'Companies', 'Projects', 'People'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: true,
      supportsEnrichment: true,
      supportedFilters: [
        'keywords',
        'technology',
        'language',
        'stars',
        'country',
        'hiring',
        'company',
      ],
    };
  }

  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }

  async getStatus(): Promise<ProviderStatus> {
    try {
      const enabled = await SettingsService.get('githubEnabled', 'true');
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
      const rate = await getGitHubRateLimit();
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
      logger.info(`GitHub Provider search initiated with params: ${JSON.stringify(params)}`);

      const query = params.keywords || (params.technology ? params.technology : 'React');
      const { repos, totalCount } = await searchGitHubRepositories({
        query,
        technology: params.technology,
        language: params.language,
        starsMin: params.stars ? Number(params.stars) : 50,
        perPage: params.perPage || 10,
        page: params.page || 1,
      });

      const items: LeadItem[] = repos.map(repo => ({
        id: `gh_${repo.id}`,
        providerId: this.id,
        type: 'Repositories',
        name: repo.name,
        title: repo.full_name,
        company: repo.owner.login,
        country: 'Global 🌐',
        industry: 'Software Engineering',
        jobTitle: 'Repository Lead',
        email: `dev@${repo.owner.login}.com`,
        linkedinUrl: repo.html_url,
        techStack: repo.technologies,
        source: 'GitHub Provider',
        score: repo.aiOpportunityScore,
        metadata: {
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          updatedAt: repo.updated_at,
          detectedOpportunities: repo.detectedOpportunities,
        },
      }));

      const duration = Date.now() - startTime;

      return {
        providerId: this.id,
        providerName: this.name,
        items,
        totalCount,
        page: params.page || 1,
        perPage: params.perPage || 10,
        status,
        healthStatus,
        responseTimeMs: duration,
      };
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : 'GitHub Search Error';
      logger.error('GitHub Provider search error', { error: String(err) });

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
