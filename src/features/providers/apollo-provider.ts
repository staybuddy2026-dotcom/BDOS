import { BaseLeadProvider } from './base-provider';
import { ProviderCapabilities, ProviderFilterKey, LeadSearchParams, LeadSearchResponse, ProviderStatus, HealthStatus, LeadItem } from './types';
import { apolloProvider } from '../apollo/provider';
import { SettingsService } from '@/lib/settings';

export class ApolloLeadProvider extends BaseLeadProvider {
  id = 'apollo';
  name = 'Apollo.io';
  description = 'Live B2B Decision Maker & Organization Prospecting Database';
  iconName = 'User';
  isBeta = false;
  isLive = true;
  version = '2.4.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 380;

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
        'country',
        'employees',
        'technology',
        'funding',
        'hiring',
        'keywords',
        'decisionMaker',
        'jobTitle',
      ],
    };
  }

  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }

  async getStatus(): Promise<ProviderStatus> {
    try {
      const apolloEnabled = await SettingsService.get('apolloEnabled', 'true');
      if (apolloEnabled !== 'true') {
        return 'Not Connected';
      }
      const apiKey = process.env.APOLLO_API_KEY;
      if (!apiKey || apiKey === 'your-apollo-api-key-here') {
        return 'Not Connected';
      }
      return 'Connected';
    } catch {
      return 'Connected';
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const status = await this.getStatus();
    if (status === 'Connected') return 'Healthy';
    return 'Offline';
  }

  async health(): Promise<{ ok: boolean; status: HealthStatus; message: string }> {
    const status = await this.getStatus();
    const healthStatus = await this.getHealthStatus();

    if (status === 'Connected') {
      return { ok: true, status: 'Healthy', message: 'Apollo.io live API connected and healthy.' };
    }
    return { ok: false, status: healthStatus, message: 'Apollo API Key unconfigured or provider disabled in settings.' };
  }

  async search(params: LeadSearchParams): Promise<LeadSearchResponse> {
    const startTime = Date.now();
    const status = await this.getStatus();
    const healthStatus = await this.getHealthStatus();
    const isPeople = params.searchType === 'people';

    if (isPeople) {
      const res = await apolloProvider.searchPeopleAdvanced({
        jobTitle: params.jobTitle || params.keywords,
        seniority: params.seniority,
        personLocation: params.country,
        orgLocation: params.country,
        keywords: params.company || params.keywords,
        techUsage: params.technology,
        hiringActivity: params.hiringKeywords,
        page: params.page || 1,
        perPage: params.perPage || 10,
      });

      const items: LeadItem[] = res.people.map((p, idx) => ({
        id: p.apolloPersonId || `apollo-person-${idx}`,
        providerId: this.id,
        name: p.personName,
        type: 'People',
        subtitle: p.jobTitle || 'Executive / Decision Maker',
        location: p.location,
        domain: p.organizationDomain,
        industry: p.organizationIndustry,
        technologies: p.technologies,
        growthSignals: p.searchMatches,
        workEmail: p.workEmail || undefined,
        personalEmail: p.personalEmail || undefined,
        phone: p.phone || undefined,
        apolloPersonId: p.apolloPersonId,
        opportunityScore: 92,
        priority: 'HIGH',
        whyThisLead: `${p.jobTitle || 'Decision Maker'} at ${p.organizationName || 'Company'}`,
      }));

      const duration = Date.now() - startTime;

      return {
        providerId: this.id,
        providerName: this.name,
        items,
        totalCount: res.totalCount,
        page: res.page,
        perPage: params.perPage || 10,
        status,
        healthStatus,
        responseTimeMs: duration,
      };
    } else {
      const res = await apolloProvider.searchOrganizationsAdvanced({
        name: params.company,
        keywords: params.keywords || params.industry,
        location: params.country,
        employeeCountRange: params.employees,
        techUsage: params.technology,
        hiringKeywords: params.hiringKeywords,
        fundingStage: params.fundingStage,
        fundingPresetDays: params.fundingDays,
        page: params.page || 1,
        perPage: params.perPage || 10,
      });

      const items: LeadItem[] = res.organizations.map((o, idx) => ({
        id: o.apolloOrganizationId || `apollo-org-${idx}`,
        providerId: this.id,
        name: o.name,
        type: 'Companies',
        subtitle: o.industry || 'Software & Technology Company',
        location: o.location,
        domain: o.domain,
        industry: o.industry,
        technologies: o.technologies,
        growthSignals: o.whyThisCompanySummary ? [{ type: 'growth', label: o.whyThisCompanySummary }] : [],
        apolloOrganizationId: o.apolloOrganizationId,
        employeeCount: o.employeeCount,
        revenuePrinted: o.revenuePrinted,
        latestFundingStage: o.latestFundingStage,
        latestFundingAmount: o.latestFundingAmount,
        openJobsCount: o.openJobsCount,
        opportunityScore: 94,
        priority: 'HIGH',
        whyThisLead: o.whyThisCompanySummary,
      }));

      const duration = Date.now() - startTime;

      return {
        providerId: this.id,
        providerName: this.name,
        items,
        totalCount: res.totalCount,
        page: res.page,
        perPage: params.perPage || 10,
        status,
        healthStatus,
        responseTimeMs: duration,
      };
    }
  }
}
