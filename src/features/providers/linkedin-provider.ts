import { BaseLeadProvider } from './base-provider';
import {
  ProviderCapabilities,
  ProviderFilterKey,
  LeadSearchParams,
  LeadSearchResponse,
  ProviderStatus,
  HealthStatus,
} from './types';

export class LinkedInLeadProvider extends BaseLeadProvider {
  id = 'linkedin';
  name = 'LinkedIn Social Intelligence';
  description = 'Social Hiring & Buying Intent Posts, Executive Announcements & Organization Signals';
  iconName = 'Share2';
  isBeta = true;
  isLive = false;
  version = '2.4.0';
  apiVersion = 'v2';
  avgResponseTimeMs = 380;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Posts', 'People', 'Companies'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: false,
      supportsEnrichment: true,
      supportedFilters: [
        'company',
        'industry',
        'country',
        'jobTitle',
        'decisionMaker',
        'keywords',
        'hiring',
        'remote',
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
    return { ok: false, status: 'Coming Soon', message: 'LinkedIn integration is coming soon. Use Apollo.io for live prospecting.' };
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
      message: 'LinkedIn integration is coming soon. Use Apollo.io for live prospecting.',
    };
  }
}
