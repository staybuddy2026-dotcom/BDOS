import { BaseLeadProvider } from './base-provider';
import { ProviderCapabilities, ProviderFilterKey, LeadSearchParams, LeadSearchResponse, ProviderStatus, HealthStatus, LeadItem } from './types';
import { apolloProvider, getLastApolloErrors, isApolloConfigured } from '../apollo/provider';
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
      return (await isApolloConfigured()) ? 'Connected' : 'Not Connected';
    } catch {
      return 'Connected';
    }
  }

  /** Real health: recent Apollo errors (limits, credits, bad key) win over "a key is configured". */
  async getHealthStatus(): Promise<HealthStatus> {
    const status = await this.getStatus();
    if (status !== 'Connected') return 'Offline';
    const errors = getLastApolloErrors();
    if (errors.some((e) => e.code === 'INVALID_KEY')) return 'Unauthorized';
    if (errors.some((e) => e.code === 'RATE_LIMIT')) return 'Rate Limited';
    if (errors.some((e) => e.code === 'CREDITS_EXHAUSTED' || e.code === 'NETWORK')) return 'Warning';
    return 'Healthy';
  }

  async health(): Promise<{ ok: boolean; status: HealthStatus; message: string }> {
    const status = await this.getStatus();
    if (status !== 'Connected') {
      return { ok: false, status: 'Offline', message: 'Apollo API key is not configured or Apollo is disabled in settings.' };
    }
    const check = await apolloProvider.checkHealth();
    if (!check.ok) return { ok: false, status: 'Unauthorized', message: check.message };
    const healthStatus = await this.getHealthStatus();
    const latest = getLastApolloErrors()[0];
    return healthStatus === 'Healthy'
      ? { ok: true, status: 'Healthy', message: 'Apollo.io API key is valid and responding.' }
      : { ok: true, status: healthStatus, message: latest?.message || 'Apollo is responding with limits.' };
  }

  async search(params: LeadSearchParams): Promise<LeadSearchResponse> {
    const startTime = Date.now();
    const status = await this.getStatus();
    const healthStatus = await this.getHealthStatus();
    const isPeople = params.searchType === 'people';

    if (isPeople) {
      const res = await apolloProvider.searchPeopleAdvanced({
        jobTitle: params.jobTitle,
        seniority: params.seniority,
        personLocation: params.country,
        keywords: params.keywords,
        companyName: params.company,
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
        message: res.error?.message,
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
        message: res.error?.message,
      };
    }
  }
}
