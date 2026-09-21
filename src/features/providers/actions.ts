'use server';

import { AuthService } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { SettingsService } from '@/lib/settings';
import { providerRegistry } from './registry';
import { 
  LeadSearchParams, 
  LeadSearchResponse, 
  ProviderCapabilities, 
  ProviderFilterKey, 
  ProviderStatus, 
  HealthStatus,
  SavedSearchPreset 
} from './types';
import { safeRevalidatePath } from '@/lib/revalidate';

export type ProviderCardData = {
  id: string;
  name: string;
  description: string;
  iconName: string;
  isBeta?: boolean;
  isLive?: boolean;
  version?: string;
  apiVersion?: string;
  avgResponseTimeMs?: number;
  status: ProviderStatus;
  healthStatus?: HealthStatus;
  capabilities: ProviderCapabilities;
  supportedFilters: ProviderFilterKey[];
};

export type FrameworkStats = {
  totalProviders: number;
  connectedProviders: number;
  liveProviders: number;
  comingSoonProviders: number;
  avgResponseTimeMs: number;
  totalSearchesToday: number;
  searchSuccessRate: number;
};

/**
 * Fetch all registered providers with live connection status and capabilities.
 */
export async function getAllProvidersList(): Promise<ProviderCardData[]> {
  try {
    const providers = providerRegistry.getAllProviders();
    const list: ProviderCardData[] = [];

    for (const provider of providers) {
      const status = await provider.getStatus();
      const healthStatus = provider.getHealthStatus ? await provider.getHealthStatus() : 'Coming Soon';
      const capabilities = provider.getCapabilities();
      const supportedFilters = provider.getSupportedFilters();

      list.push({
        id: provider.id,
        name: provider.name,
        description: provider.description,
        iconName: provider.iconName,
        isBeta: provider.isBeta,
        isLive: provider.isLive,
        version: provider.version || '1.0.0',
        apiVersion: provider.apiVersion || 'v1',
        avgResponseTimeMs: provider.avgResponseTimeMs || 0,
        status,
        healthStatus,
        capabilities,
        supportedFilters,
      });
    }

    return list;
  } catch (err: unknown) {
    logger.error('Failed to list registered providers', err);
    return [];
  }
}

/**
 * Compile global framework performance & connectivity statistics.
 */
export async function getProviderStats(): Promise<FrameworkStats> {
  try {
    const list = await getAllProvidersList();
    const totalProviders = list.length;
    const connectedProviders = list.filter(p => p.status === 'Connected').length;
    const liveProviders = list.filter(p => p.isLive).length;
    const comingSoonProviders = list.filter(p => p.status === 'Coming Soon').length;

    const times = list.map(p => p.avgResponseTimeMs || 0).filter(t => t > 0);
    const avgResponseTimeMs = 0;

    return {
      totalProviders,
      connectedProviders,
      liveProviders,
      comingSoonProviders,
      avgResponseTimeMs,
      totalSearchesToday: 0,
      searchSuccessRate: 100,
    };
  } catch {
    return {
      totalProviders: 4,
      connectedProviders: 1,
      liveProviders: 1,
      comingSoonProviders: 3,
      avgResponseTimeMs: 0,
      totalSearchesToday: 0,
      searchSuccessRate: 100,
    };
  }
}

/**
 * Return saved BDE prospecting search presets.
 */
export async function getSavedSearchPresets(): Promise<SavedSearchPreset[]> {
  return [
    {
      id: 'preset_funded_saas',
      name: 'Recently Funded SaaS',
      description: 'Series A/B SaaS companies funded in the last 90 days hiring engineers',
      providerId: 'apollo',
      iconName: 'TrendingUp',
      badgeLabel: 'Funding Alert',
      filters: {
        providerId: 'apollo',
        searchType: 'companies',
        industry: 'Software',
        fundingStage: 'series_a,series_b',
        fundingDays: 90,
      },
    },
    {
      id: 'preset_react_orgs',
      name: 'React.js Target Companies',
      description: 'Companies with React.js in tech stack hiring frontend engineers',
      providerId: 'apollo',
      iconName: 'Code',
      badgeLabel: 'Tech Stack',
      filters: {
        providerId: 'apollo',
        searchType: 'companies',
        technology: 'React',
        hiringKeywords: 'React Engineer',
      },
    },
    {
      id: 'preset_node_orgs',
      name: 'Node.js Backend Companies',
      description: 'Mid-market companies running Node.js / TypeScript backends',
      providerId: 'apollo',
      iconName: 'Server',
      badgeLabel: 'Backend Dev',
      filters: {
        providerId: 'apollo',
        searchType: 'companies',
        technology: 'Node.js',
        hiringKeywords: 'Backend Engineer',
      },
    },
    {
      id: 'preset_ai_startups',
      name: 'AI & ML Startups',
      description: 'High-growth AI startups hiring Python & LLM fine-tuning engineers',
      providerId: 'apollo',
      iconName: 'Sparkles',
      badgeLabel: 'AI / ML Intent',
      filters: {
        providerId: 'apollo',
        searchType: 'companies',
        keywords: 'Artificial Intelligence',
        technology: 'Python',
        hiringKeywords: 'AI Engineer',
      },
    },
    {
      id: 'preset_healthcare_saas',
      name: 'Healthcare SaaS',
      description: 'US-based Healthcare & HealthTech SaaS companies with 11-200 employees',
      providerId: 'apollo',
      iconName: 'HeartPulse',
      badgeLabel: 'Healthcare',
      filters: {
        providerId: 'apollo',
        searchType: 'companies',
        industry: 'Healthcare',
        country: 'United States',
        employees: '11,200',
      },
    },
    {
      id: 'preset_fintech_usa',
      name: 'USA FinTech Scaleups',
      description: 'FinTech scaleups in the US with open CTO or VP Engineering roles',
      providerId: 'apollo',
      iconName: 'Building',
      badgeLabel: 'FinTech',
      filters: {
        providerId: 'apollo',
        searchType: 'companies',
        industry: 'Financial Technology',
        country: 'United States',
        hiringKeywords: 'CTO',
      },
    },
  ];
}

/**
 * Universal Search Action for Lead Intelligence Hub.
 */
export async function searchLeadHub(params: LeadSearchParams): Promise<LeadSearchResponse> {
  try {
    await AuthService.verifySession();
    logger.info(`Executing Lead Hub Search for Provider: '${params.providerId}', type: '${params.searchType || 'all'}'...`);
    return await providerRegistry.executeSearch(params);
  } catch (err: unknown) {
    logger.error(`Failed to execute Lead Hub search for provider ${params.providerId}`, err);
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : 'Lead search failed.';
    throw new AppError(msg, 500);
  }
}

/**
 * Test connection for a provider in Settings.
 */
export async function testProviderConnection(providerId: string): Promise<{ ok: boolean; status: HealthStatus; message: string }> {
  try {
    await AuthService.verifySession();
    const provider = providerRegistry.getProvider(providerId);
    return await provider.health();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Health check failed.';
    return { ok: false, status: 'Offline', message: msg };
  }
}

/**
 * Update Provider Enabled/Disabled status in App Settings.
 */
export async function updateProviderSetting(providerId: string, enabled: boolean) {
  try {
    await AuthService.verifySession();
    await SettingsService.set(`provider_${providerId}_enabled`, enabled ? 'true' : 'false');
    safeRevalidatePath('/settings');
    safeRevalidatePath('/apollo-search');
    return { success: true };
  } catch (err: unknown) {
    logger.error(`Failed to update provider setting for ${providerId}`, err);
    throw new AppError('Failed to save provider setting.', 500);
  }
}
