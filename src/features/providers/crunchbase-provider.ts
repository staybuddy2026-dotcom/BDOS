import { BaseLeadProvider } from './base-provider';
import {
  ProviderCapabilities,
  ProviderFilterKey,
  LeadSearchParams,
  LeadSearchResponse,
  ProviderStatus,
  HealthStatus,
} from './types';

export class CrunchbaseLeadProvider extends BaseLeadProvider {
  id = 'crunchbase';
  name = 'Crunchbase Growth Intelligence';
  description = 'Venture Funding Rounds, M&A Activity, Growth Signals';
  iconName = 'TrendingUp';
  isBeta = true;
  isLive = false;
  version = '2.4.0';
  apiVersion = 'v4';
  avgResponseTimeMs = 380;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Companies', 'Funding'],
      supportsCompanies: true,
      supportsPeople: false,
      supportsProjects: false,
      supportsEnrichment: true,
      supportedFilters: [
        'company',
        'industry',
        'funding',
        'revenue',
        'country',
        'employees',
        'keywords',
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
    return { ok: false, status: 'Coming Soon', message: 'Crunchbase integration is coming soon. Use Apollo.io for live prospecting.' };
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
      message: 'Crunchbase integration is coming soon. Use Apollo.io for live prospecting.',
    };
  }
}
