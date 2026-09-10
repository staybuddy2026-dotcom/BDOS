import { 
  ILeadProvider, 
  ProviderStatus, 
  HealthStatus,
  ProviderCapabilities, 
  ProviderFilterKey, 
  LeadSearchParams, 
  LeadSearchResponse 
} from './types';

export abstract class BaseLeadProvider implements ILeadProvider {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract iconName: string;
  isBeta?: boolean = true;
  isLive?: boolean = false;
  version?: string = '1.0.0';
  apiVersion?: string = 'v1';
  avgResponseTimeMs?: number = 0;

  abstract getCapabilities(): ProviderCapabilities;
  abstract getSupportedFilters(): ProviderFilterKey[];

  async getStatus(): Promise<ProviderStatus> {
    return 'Coming Soon';
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const status = await this.getStatus();
    if (status === 'Connected') return 'Healthy';
    if (status === 'Coming Soon') return 'Coming Soon';
    if (status === 'Not Connected') return 'Offline';
    return 'Offline';
  }

  async health(): Promise<{ ok: boolean; status: HealthStatus; message: string }> {
    const status = await this.getStatus();
    const healthStatus = await this.getHealthStatus();

    if (status === 'Connected') {
      return { ok: true, status: 'Healthy', message: `${this.name} API connection verified.` };
    }
    return { ok: false, status: healthStatus, message: `${this.name} provider is in '${status}' state.` };
  }

  async search(params: LeadSearchParams): Promise<LeadSearchResponse> {
    const startTime = Date.now();
    const status = await this.getStatus();
    const healthStatus = await this.getHealthStatus();
    const duration = Date.now() - startTime;

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
      message: `${this.name} integration is currently in '${status}' state. Live API integration scheduled for future release phases.`,
    };
  }
}
