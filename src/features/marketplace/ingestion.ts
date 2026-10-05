'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { db } from '@/lib/db';
import { countListingsByProvider, listListings, parseCsv, saveListing } from './store';
import { ProviderStatus, HealthStatus } from '@/features/providers/types';

export type UniversalOpportunity = {
  id: string;
  providerId: string;
  providerName: string;
  projectTitle: string;
  projectDescription: string;
  budget: string;
  budgetCurrency: string;
  estimatedValueNumber: number;
  budgetType: 'Fixed-Price' | 'Hourly';
  clientCountry: string;
  clientTimezone: string;
  technologyStack: string[];
  skills: string[];
  industry: string;
  projectType: string;
  experienceLevel: 'Entry' | 'Intermediate' | 'Expert';
  engagementModel: 'Project Basis' | 'Staff Augmentation' | 'Dedicated Team';
  urgency: 'Immediate' | 'High' | 'Normal';
  postedDate: string;
  proposalDeadline: string;
  projectUrl: string;
  sourceUrl: string;
  aiOpportunityScore: number;
  duplicateHash: string;
  status: 'COLLECTED' | 'QUALIFIED' | 'SENT_TO_REVIEW' | 'ARCHIVED';
  tags: string[];
  
  // AI Qualification Fields
  revenuePotential: string;
  complexity: 'Low' | 'Medium' | 'High' | 'Enterprise';
  deliveryRisk: string;
  estimatedTeamSize: string;
  estimatedTimeline: string;
  winningStrategy: string;
};

export type ProviderHealthTelemetry = {
  providerId: string;
  providerName: string;
  status: ProviderStatus | string;
  health: HealthStatus | string;
  lastSync: string;
  opportunitiesRetrieved: number;
  avgResponseTimeMs: number;
  errorsCount: number;
  isLive: boolean;
};

/**
 * The team's listings, filtered. Listings are stored in the database (see store.ts); nothing is scraped
 * here: Upwork, Freelancer, Guru, Toptal and RSS are not connected yet.
 */
export async function collectMarketplaceOpportunities(params?: {
  providerId?: string;
  technology?: string;
  keywords?: string;
  minBudget?: number;
  budgetType?: string;
  experienceLevel?: string;
}): Promise<{ opportunities: UniversalOpportunity[]; totalCount: number; duplicatesFiltered: number }> {
  try {
    await AuthService.verifySession();
    let filtered = await listListings();

    if (params?.providerId && params.providerId !== 'all') filtered = filtered.filter((o) => o.providerId === params.providerId);
    if (params?.technology) {
      const q = params.technology.toLowerCase();
      filtered = filtered.filter((o) => o.technologyStack.some((t) => t.toLowerCase().includes(q)) || o.projectTitle.toLowerCase().includes(q) || o.skills.some((x) => x.toLowerCase().includes(q)));
    }
    if (params?.keywords) {
      const q = params.keywords.toLowerCase();
      filtered = filtered.filter((o) => o.projectTitle.toLowerCase().includes(q) || o.projectDescription.toLowerCase().includes(q) || o.industry.toLowerCase().includes(q));
    }
    if (params?.budgetType) filtered = filtered.filter((o) => o.budgetType === params.budgetType);
    if (params?.experienceLevel) filtered = filtered.filter((o) => o.experienceLevel === params.experienceLevel);
    if (params?.minBudget) filtered = filtered.filter((o) => o.estimatedValueNumber >= params.minBudget!);

    // Duplicates are refused when a listing is saved, so every stored listing is already unique.
    return { opportunities: filtered, totalCount: filtered.length, duplicatesFiltered: 0 };
  } catch (err: unknown) {
    logger.error('Failed to collect marketplace opportunities', err);
    throw new AppError('Opportunity collection failed.', 500);
  }
}

/** Hides a listing from the feed for the whole team. */
export async function dismissOpportunity(opportunityId: string): Promise<{ success: boolean; id: string }> {
  try {
    await AuthService.verifySession();
    await db.marketplaceOpportunity.updateMany({ where: { id: opportunityId }, data: { status: 'ARCHIVED' } });
    return { success: true, id: opportunityId };
  } catch (err: unknown) {
    logger.error(`Failed to dismiss opportunity ${opportunityId}`, err);
    throw new AppError('Failed to dismiss opportunity.', 500);
  }
}

/**
 * The in-app "Send test" of the webhook. Real webhook calls come in through /api/marketplace/webhook,
 * which checks the webhook secret instead of a login.
 */
export async function ingestInboundWebhookOpportunity(data: {
  projectTitle: string;
  projectDescription: string;
  budget?: string;
  budgetType?: 'Fixed-Price' | 'Hourly';
  clientCountry?: string;
  technologyStack?: string[];
  projectUrl?: string;
  providerName?: string;
}): Promise<{ opportunity: UniversalOpportunity; isDuplicate: boolean }> {
  try {
    await AuthService.verifySession();
    return await saveListing({
      providerId: 'webhook',
      providerName: data.providerName || 'Inbound webhook',
      title: data.projectTitle,
      description: data.projectDescription,
      budget: data.budget,
      budgetType: data.budgetType,
      country: data.clientCountry,
      technologyStack: data.technologyStack,
      projectUrl: data.projectUrl,
      tags: ['Inbound webhook', 'Test'],
    });
  } catch (err: unknown) {
    logger.error('Failed to ingest inbound webhook opportunity', err);
    throw new AppError('Inbound webhook ingestion failed.', 500);
  }
}

/** First rows of a CSV, to check the columns before importing. */
export async function previewCsvImport(csvContent: string): Promise<{
  headers: string[];
  totalRows: number;
  sampleRows: Record<string, string>[];
}> {
  await AuthService.verifySession();
  const rows = parseCsv(csvContent || '');
  if (!rows.length) throw new AppError('Empty CSV file.', 400);
  const headers = rows[0];
  const sampleRows = rows.slice(1, 6).map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])));
  return { headers, totalRows: rows.length - 1, sampleRows };
}

/**
 * Imports listings from CSV. Columns are matched by name (title, description, budget, country, technology,
 * url). A row with no title is counted as an error; a listing already stored is counted as a duplicate.
 */
export async function importCsvOpportunities(
  csvContent: string,
  mapping?: { titleKey?: string; descKey?: string; budgetKey?: string; countryKey?: string; techKey?: string; urlKey?: string }
): Promise<{ importedCount: number; duplicatesCount: number; errorsCount: number }> {
  try {
    await AuthService.verifySession();
    const rows = parseCsv(csvContent || '');
    if (rows.length < 2) return { importedCount: 0, duplicatesCount: 0, errorsCount: 0 };

    const headers = rows[0];
    const col = (key: string | undefined, pattern: RegExp) => {
      const name = key || headers.find((h) => pattern.test(h));
      return name ? headers.indexOf(name) : -1;
    };
    const titleCol = col(mapping?.titleKey, /title|project|name/i);
    const descCol = col(mapping?.descKey, /desc|detail|summary/i);
    const budgetCol = col(mapping?.budgetKey, /budget|price|rate|value/i);
    const countryCol = col(mapping?.countryKey, /country|location/i);
    const techCol = col(mapping?.techKey, /tech|skill|stack/i);
    const urlCol = col(mapping?.urlKey, /url|link/i);
    const at = (row: string[], i: number) => (i >= 0 ? row[i] || '' : '');

    let importedCount = 0;
    let duplicatesCount = 0;
    let errorsCount = 0;
    for (const row of rows.slice(1, 1001)) {
      const title = at(row, titleCol);
      if (!title) { errorsCount++; continue; }
      try {
        const res = await saveListing({
          providerId: 'manual',
          providerName: 'CSV import',
          title,
          description: at(row, descCol) || title,
          budget: at(row, budgetCol),
          country: at(row, countryCol),
          technologyStack: at(row, techCol).split(/[;,|]/),
          projectUrl: at(row, urlCol),
          tags: ['CSV import'],
        });
        if (res.isDuplicate) duplicatesCount++; else importedCount++;
      } catch {
        errorsCount++;
      }
    }
    return { importedCount, duplicatesCount, errorsCount };
  } catch (err: unknown) {
    logger.error('Failed to import CSV opportunities', err);
    throw new AppError('CSV import failed.', 500);
  }
}

/**
 * Fetch and parse RSS feed XML text.
 */
export async function refreshRssFeeds(feedType?: 'tech' | 'startup' | 'remote' | 'custom', customUrl?: string): Promise<{
  newOpportunities: number;
  totalParsed: number;
}> {
  await AuthService.verifySession();
  logger.info(`RSS feed polling requested (Type: ${feedType || 'all'}, URL: ${customUrl || 'default'}) — RSS auto-ingestion is not yet a live integration.`);
  // No RSS parser is wired up yet — return honestly rather than fabricate a parsed feed result.
  return { newOpportunities: 0, totalParsed: 0 };
}

/**
 * Fetch Health Telemetry across all registered marketplace providers.
 */
export async function getProviderHealthList(): Promise<ProviderHealthTelemetry[]> {
  try {
    // Automatic marketplace scraping providers are all "Coming Soon" — none are
    // registered as live in the provider registry. Report that honestly instead
    // of fabricating sync timestamps or random "opportunities retrieved" counts.
    const counts = await countListingsByProvider();
    const marketplaceProviderNames: Record<string, string> = {
      upwork: 'Upwork Enterprise',
      freelancer: 'Freelancer.com',
      guru: 'Guru.com',
      toptal: 'Toptal Direct Contract',
      rss: 'RSS Procurement Feeds',
    };

    const list: ProviderHealthTelemetry[] = Object.entries(marketplaceProviderNames).map(([providerId, providerName]) => ({
      providerId,
      providerName,
      status: 'Coming Soon',
      health: 'Coming Soon',
      lastSync: 'Not yet connected',
      opportunitiesRetrieved: counts[providerId] || 0,
      avgResponseTimeMs: 0,
      errorsCount: 0,
      isLive: false,
    }));

    // Manual CSV import and inbound webhooks are genuinely functional today.
    list.push(
      {
        providerId: 'manual',
        providerName: 'Manual CSV Import',
        status: 'Connected',
        health: 'Healthy',
        lastSync: 'On demand',
        opportunitiesRetrieved: counts.manual || 0,
        avgResponseTimeMs: 0,
        errorsCount: 0,
        isLive: true,
      },
      {
        providerId: 'webhook',
        providerName: 'Inbound Webhook',
        status: 'Connected',
        health: 'Healthy',
        lastSync: 'On demand',
        opportunitiesRetrieved: counts.webhook || 0,
        avgResponseTimeMs: 0,
        errorsCount: 0,
        isLive: true,
      }
    );

    return list;
  } catch (err: unknown) {
    logger.error('Failed to query provider health telemetry', err);
    return [];
  }
}

/**
 * Manual Trigger Sync for a specific Marketplace Provider.
 * Only Manual CSV Import and Inbound Webhook are live today; every automatic
 * scraping provider is "Coming Soon" and honestly reports that instead of a fake success.
 */
export async function syncMarketplaceProvider(providerId: string): Promise<{ success: boolean; message: string; itemsRetrieved: number }> {
  try {
    await AuthService.verifySession();
    logger.info(`Triggering manual sync for Marketplace Provider ID '${providerId}'...`);

    if (providerId !== 'manual' && providerId !== 'webhook') {
      return {
        success: false,
        message: `Automatic sync for '${providerId}' is coming soon. Use CSV Import or the Webhook endpoint to add real opportunities today.`,
        itemsRetrieved: 0,
      };
    }

    return {
      success: true,
      message: `'${providerId === 'manual' ? 'Manual CSV Import' : 'Inbound Webhook'}' is already live — use the Import/Webhook tools to add opportunities.`,
      itemsRetrieved: (await countListingsByProvider())[providerId] || 0,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Provider sync failed.';
    return { success: false, message: msg, itemsRetrieved: 0 };
  }
}
