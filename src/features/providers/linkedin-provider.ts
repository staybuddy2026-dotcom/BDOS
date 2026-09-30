import { BaseLeadProvider } from './base-provider';
import {
  ProviderCapabilities,
  ProviderFilterKey,
  LeadSearchParams,
  LeadSearchResponse,
  ProviderStatus,
  HealthStatus,
  LeadItem,
} from './types';
import { isLinkedInEnabledSetting } from '../linkedin/settings';
import { getLastLinkedInError, isLinkedInConfigured, linkedinProvider, LINKEDIN_SETUP_HINT } from '../linkedin/provider';
import type { LinkedInErrorInfo } from '../linkedin/types';

const healthFromError = (error?: LinkedInErrorInfo): HealthStatus => {
  if (!error) return 'Healthy';
  if (error.code === 'INVALID_KEY') return 'Unauthorized';
  if (error.code === 'RATE_LIMIT') return 'Rate Limited';
  if (error.code === 'NOT_CONFIGURED') return 'Offline';
  return 'Warning';
};

export class LinkedInLeadProvider extends BaseLeadProvider {
  id = 'linkedin';
  name = 'LinkedIn Social Intelligence';
  description = 'Buying-signal posts, decision makers and company pages from LinkedIn';
  iconName = 'Share2';
  isBeta = false;
  isLive = true;
  version = '3.0.0';
  apiVersion = 'v2';
  avgResponseTimeMs = 0;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Posts', 'People', 'Companies'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: false,
      supportsEnrichment: true,
      supportedFilters: ['company', 'country', 'jobTitle', 'decisionMaker', 'keywords', 'hiring'],
    };
  }

  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }

  /** Connected as soon as a real key exists in .env or Settings; nothing to flip in code. */
  async getStatus(): Promise<ProviderStatus> {
    try {
      if (!(await isLinkedInEnabledSetting())) return 'Not Connected';
      return (await isLinkedInConfigured()) ? 'Connected' : 'Not Connected';
    } catch {
      return 'Not Connected';
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    if ((await this.getStatus()) !== 'Connected') return 'Offline';
    return healthFromError(getLastLinkedInError());
  }

  async health(): Promise<{ ok: boolean; status: HealthStatus; message: string }> {
    if ((await this.getStatus()) !== 'Connected') {
      return { ok: false, status: 'Offline', message: `LinkedIn is not connected. ${LINKEDIN_SETUP_HINT}` };
    }
    const account = await linkedinProvider.checkAccount();
    return { ok: account.ok, status: account.ok ? 'Healthy' : healthFromError(account.error) === 'Healthy' ? 'Warning' : healthFromError(account.error), message: account.message };
  }

  async search(params: LeadSearchParams): Promise<LeadSearchResponse> {
    const started = Date.now();
    const status = await this.getStatus();
    const base = { providerId: this.id, providerName: this.name, page: params.page || 1, perPage: params.perPage || 10 };
    if (status !== 'Connected') {
      return { ...base, items: [], totalCount: 0, status, healthStatus: 'Offline', responseTimeMs: 0, message: `LinkedIn is not connected. ${LINKEDIN_SETUP_HINT}` };
    }

    let items: LeadItem[] = [];
    let error: LinkedInErrorInfo | undefined;

    if (params.searchType === 'people') {
      const res = await linkedinProvider.searchProfiles({
        query: params.keywords || params.company,
        jobTitles: params.jobTitle ? params.jobTitle.split(',') : undefined,
        locations: params.country ? [params.country] : undefined,
        maxItems: params.perPage || 10,
      });
      error = res.error;
      items = res.items.map((p) => ({
        id: p.id,
        providerId: this.id,
        name: p.fullName,
        type: 'People',
        subtitle: p.headline || [p.jobTitle, p.companyName].filter(Boolean).join(' at '),
        location: p.location,
        url: p.profileUrl,
        workEmail: p.email,
        whyThisLead: [p.jobTitle, p.companyName].filter(Boolean).join(' at ') || undefined,
      }));
    } else {
      // LinkedIn's strongest lead signal is what people post, so keyword searches return posts.
      const query = [params.keywords, params.hiringKeywords, params.company].filter(Boolean).join(' ');
      const res = await linkedinProvider.searchPosts({ query, maxPosts: params.perPage || 10 });
      error = res.error;
      items = res.items.map((p) => ({
        id: p.id,
        providerId: this.id,
        name: p.authorName,
        type: 'Posts',
        subtitle: p.authorHeadline || '',
        url: p.url,
        details: { content: p.content, postedAt: p.postedAt, authorProfileUrl: p.authorProfileUrl, likes: p.likes, comments: p.comments },
        whyThisLead: p.content.slice(0, 160),
      }));
    }

    return {
      ...base,
      items,
      totalCount: items.length,
      status,
      healthStatus: healthFromError(error),
      responseTimeMs: Date.now() - started,
      message: error?.message,
    };
  }
}
