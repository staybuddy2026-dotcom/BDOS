import { BaseLeadProvider } from '../base-provider';
import {
  ProviderCapabilities,
  ProviderFilterKey,
  LeadSearchParams,
  LeadSearchResponse,
  ProviderStatus,
  HealthStatus,
} from '../types';

export class GitHubLeadProvider extends BaseLeadProvider {
  id = 'github';
  name = 'GitHub Engineering Intelligence';
  description = 'Engineering Intelligence Platform for Repository & Hiring Signals';
  iconName = 'GitBranch';
  isBeta = true;
  isLive = false;
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
    return 'Coming Soon';
  }

  async getHealthStatus(): Promise<HealthStatus> {
    return 'Coming Soon';
  }

  async health(): Promise<{ ok: boolean; status: HealthStatus; message: string }> {
    return { ok: false, status: 'Coming Soon', message: 'GitHub integration is coming soon. Use Apollo.io for live prospecting.' };
  }

  async search(params: LeadSearchParams): Promise<LeadSearchResponse> {
    return {
      providerId: this.id,
      providerName: this.name,
      items: [],
      totalCount: 0,
      page: params.page || 1,
      perPage: params.perPage || 10,
      status: 'Coming Soon',
      healthStatus: 'Coming Soon',
      responseTimeMs: 0,
      message: 'GitHub integration is coming soon. Use Apollo.io for live prospecting.',
    };
  }
}
