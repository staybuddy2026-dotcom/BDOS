import { ILeadProvider, LeadSearchParams, LeadSearchResponse } from './types';
import { ApolloLeadProvider } from './apollo-provider';
import { GitHubLeadProvider } from './github/github-provider';
import { CrunchbaseLeadProvider } from './crunchbase-provider';
import { LinkedInLeadProvider } from './linkedin-provider';
import { logger } from '@/lib/logger';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, ILeadProvider> = new Map();

  private constructor() {
    this.registerDefaultProviders();
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Version 1 Core Providers: Apollo.io, LinkedIn, Crunchbase, GitHub.
   * Other secondary providers commented out for lightweight V1 release.
   */
  private registerDefaultProviders() {
    // 1. Apollo.io
    this.register(new ApolloLeadProvider());
    // 2. LinkedIn
    this.register(new LinkedInLeadProvider());
    // 3. Crunchbase
    this.register(new CrunchbaseLeadProvider());
    // 4. GitHub
    this.register(new GitHubLeadProvider());
  }

  public register(provider: ILeadProvider): void {
    if (this.providers.has(provider.id)) {
      logger.warn(`Provider with ID '${provider.id}' is already registered. Overwriting registration.`);
    }
    this.providers.set(provider.id, provider);
    logger.info(`Registered Lead Provider: '${provider.name}' (ID: '${provider.id}')`);
  }

  public getProvider(providerId: string): ILeadProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return this.providers.get('apollo')!;
    }
    return provider;
  }

  public getAllProviders(): ILeadProvider[] {
    return Array.from(this.providers.values());
  }

  public getRegisteredProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  public async executeSearch(params: LeadSearchParams): Promise<LeadSearchResponse> {
    const provider = this.getProvider(params.providerId);
    return provider.search(params);
  }

  public async executeCrossProviderLookup(domain: string): Promise<LeadSearchResponse[]> {
    logger.info(`ProviderRegistry: Executing cross-provider lookup for domain '${domain}' across active V1 providers...`);
    const liveProviders = Array.from(this.providers.values()).filter(p => p.isLive);
    const searches = liveProviders.map(p => p.search({ providerId: p.id, keywords: domain, company: domain }));
    return Promise.all(searches);
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
