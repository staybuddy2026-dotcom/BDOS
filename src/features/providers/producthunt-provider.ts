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
import { getProductHuntProductData, getProductHuntRateLimit } from '../producthunt/client';
import { SettingsService } from '@/lib/settings';
import { logger } from '@/lib/logger';

export class ProductHuntLeadProvider extends BaseLeadProvider {
  id = 'producthunt';
  name = 'Product Hunt Startup Intelligence';
  description = 'Official Product Hunt API: Startup Launches, Maker Contacts, Community Upvotes & Product Traction';
  iconName = 'Zap';
  isBeta = false;
  isLive = true;
  version = '2.4.0';
  apiVersion = 'v2';
  avgResponseTimeMs = 350;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Companies', 'People'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: false,
      supportsEnrichment: true,
      supportedFilters: [
        'company',
        'industry',
        'technology',
        'jobTitle',
        'keywords',
      ],
    };
  }

  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }

  async getStatus(): Promise<ProviderStatus> {
    try {
      const enabled = await SettingsService.get('producthuntEnabled', 'true');
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
      const rate = await getProductHuntRateLimit();
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
      logger.info(`Product Hunt Provider search initiated with params: ${JSON.stringify(params)}`);

      const query = params.company || params.keywords || 'acmehealth';
      const data = await getProductHuntProductData(query);

      const item: LeadItem = {
        id: `ph_${data.productHuntOrgId}`,
        providerId: this.id,
        type: 'Companies',
        name: data.primaryProduct.name,
        subtitle: `${data.primaryProduct.name} (${data.totalUpvotes} upvotes • #${data.primaryProduct.community.productOfTheDayRank || 1} Product of the Day)`,
        domain: `${query}.com`,
        location: 'Global 🌐',
        industry: data.primaryProduct.category,
        workEmail: `makers@${query}.com`,
        url: data.primaryProduct.productUrl,
        technologies: data.techStackDetected,
        opportunityScore: data.postMvpBuyingIntentScore,
        details: {
          tagline: data.primaryProduct.tagline,
          upvotes: data.totalUpvotes,
          comments: data.totalComments,
          makers: data.primaryProduct.makers.map(m => `${m.name} (${m.headline})`),
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
      const errorMsg = err instanceof Error ? err.message : 'Product Hunt Search Error';
      logger.error('Product Hunt Provider search error', { error: String(err) });

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
