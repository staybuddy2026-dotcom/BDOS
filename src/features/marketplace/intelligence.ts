'use server';

import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { UniversalOpportunity } from '@/features/marketplace/ingestion';
import { safeRevalidatePath } from '@/lib/revalidate';
import { sameTech } from '@/lib/techMatch';

export type BidRecommendationVerdict = 'BID' | 'CONSIDER' | 'DO NOT BID';

/** A service from the team's catalog that matches the listing's stack. */
export type BidServiceMatch = {
  name: string;
  matchedTech: string[];
  startingPriceUsd: string;
  /** Whether the listing's budget reaches the service's starting price; null when either is unknown. */
  budgetFits: boolean | null;
};

/**
 * Bid report built from the listing itself and the team's service catalog. It states what is known
 * (budget, stack, matching services) and what is missing; it does not guess the client, margin or timeline.
 */
export type OpportunityIntelligenceReport = {
  opportunityId: string;
  overallScore: number;
  recommendation: BidRecommendationVerdict;
  /** Facts in favour of bidding. */
  reasons: string[];
  /** Facts against, or things to check before bidding. */
  risks: string[];
  budget: string;
  budgetType: string;
  estimatedValueUsd: number | null;
  services: BidServiceMatch[];
  pitch: string;
};

export type SearchHistoryItem = {
  id: string;
  providerId: string;
  keywords: string;
  country: string;
  budget: string;
  technology: string;
  resultsCount: number;
  timestamp: string;
  executionTimeMs: number;
};

export type SavedSearchItem = {
  id: string;
  name: string;
  providerId: string;
  keywords: string;
  country: string;
  budget: string;
  technology: string;
  category: string;
  isShared: boolean;
  createdDate: string;
};

export type ProviderAnalyticsItem = {
  providerId: string;
  providerName: string;
  projectsImported: number;
  qualifiedCount: number;
  rejectedCount: number;
  averageBudget: string;
  averageAiScore: number;
  /** Listings from this source that became CRM deals. */
  dealsInCrm: number;
  dealsWon: number;
  /** Won deals out of listings imported. */
  successRatePercent: number;
};

const usdNumber = (v: string) => Number((v || '').replace(/[^0-9.]/g, '')) || null;

/** Bid report for one listing: verdict, the facts behind it, and matching services from the catalog. */
export async function getOpportunityIntelligence(opp: UniversalOpportunity): Promise<OpportunityIntelligenceReport> {
  try {
    await AuthService.verifySession();
    const { getServiceCatalog } = await import('@/features/learning/actions');
    const catalog = await getServiceCatalog().catch(() => []);

    const stack = opp.technologyStack || [];
    const value = opp.estimatedValueNumber || null;
    const services: BidServiceMatch[] = catalog
      .map((svc) => {
        const matchedTech = svc.stack.split(',').map((t) => t.trim()).filter((t) => t && stack.some((x) => sameTech(x, t)));
        const min = usdNumber(svc.minUsd);
        return { name: svc.name, matchedTech, startingPriceUsd: svc.minUsd, budgetFits: value && min ? value >= min : null };
      })
      .filter((x) => x.matchedTech.length)
      .sort((a, b) => b.matchedTech.length - a.matchedTech.length)
      .slice(0, 3);

    const reasons: string[] = [];
    const risks: string[] = [];
    if (services.length) reasons.push(`Matches your ${services[0].name} service (${services[0].matchedTech.slice(0, 4).join(', ')}).`);
    else if (stack.length) risks.push(`None of your catalog services lists ${opp.technologyStack.slice(0, 3).join(', ')}.`);
    else risks.push('No technology is stated, so service fit cannot be checked.');
    if (value) reasons.push(`Budget stated: ${opp.budget}.`);
    else if (opp.budgetType === 'Hourly') risks.push(`Hourly rate (${opp.budget}): check the hours and duration before bidding.`);
    else risks.push('No budget stated: ask before writing a full proposal.');
    if (services[0]?.budgetFits === false) risks.push(`The budget is below the ${services[0].startingPriceUsd} starting price of ${services[0].name}.`);
    if (services[0]?.budgetFits) reasons.push(`The budget covers the ${services[0].startingPriceUsd} starting price of ${services[0].name}.`);
    if ((opp.projectDescription || '').length < 120) risks.push('The description is short: the scope will need clarifying.');
    if (opp.projectUrl) reasons.push('The original listing is linked, so details can be checked.');

    const recommendation: BidRecommendationVerdict = services.length && services[0].budgetFits !== false && opp.aiOpportunityScore >= 88 ? 'BID'
      : services.length || opp.aiOpportunityScore >= 70 ? 'CONSIDER' : 'DO NOT BID';

    const pitch = services.length
      ? `Lead with ${services[0].name}: say how you have delivered ${services[0].matchedTech.slice(0, 2).join(' and ')} work, and propose a short first milestone so the client can judge quickly.`
      : 'Ask a clarifying question about the stack and scope first; a generic proposal is unlikely to win.';

    return {
      opportunityId: opp.id,
      overallScore: opp.aiOpportunityScore,
      recommendation,
      reasons,
      risks,
      budget: opp.budget,
      budgetType: opp.budgetType,
      estimatedValueUsd: value,
      services,
      pitch,
    };
  } catch (err: unknown) {
    logger.error(`Failed to build the bid report for ${opp.id}`, err);
    throw new AppError('Could not build the bid report.', 500);
  }
}

const PROVIDER_NAMES: Record<string, string> = {
  manual: 'CSV import',
  webhook: 'Inbound webhook',
  upwork: 'Upwork',
  freelancer: 'Freelancer.com',
  guru: 'Guru.com',
  toptal: 'Toptal',
  rss: 'RSS feeds',
};

/**
 * Per source: how many listings came in, how many are still in play, and how many became CRM deals and
 * were won. Counted from the stored listings and the CRM, so a new workspace shows zeros.
 */
export async function getProviderAnalytics(): Promise<ProviderAnalyticsItem[]> {
  try {
    await AuthService.verifySession();
    const rows = await db.marketplaceOpportunity.findMany({ select: { providerId: true, status: true, estimatedValue: true, projectUrl: true, data: true } });
    const urls = rows.map((r) => r.projectUrl).filter(Boolean);
    const deals = urls.length
      ? await db.deal.findMany({ where: { source: 'MARKETPLACE', sourceRef: { in: urls } }, select: { sourceRef: true, stage: true } })
      : [];
    const dealByUrl = new Map(deals.map((d) => [d.sourceRef!, d.stage]));

    const byProvider = new Map<string, typeof rows>();
    for (const row of rows) byProvider.set(row.providerId, [...(byProvider.get(row.providerId) || []), row]);

    return [...byProvider.entries()].map(([providerId, list]) => {
      const values = list.map((r) => r.estimatedValue).filter((v): v is number => v != null);
      const scores = list.map((r) => Number((r.data as { aiOpportunityScore?: number })?.aiOpportunityScore) || 0).filter(Boolean);
      const inCrm = list.filter((r) => r.projectUrl && dealByUrl.has(r.projectUrl));
      const won = inCrm.filter((r) => dealByUrl.get(r.projectUrl) === 'WON').length;
      return {
        providerId,
        providerName: PROVIDER_NAMES[providerId] || providerId,
        projectsImported: list.length,
        qualifiedCount: list.filter((r) => r.status !== 'ARCHIVED').length,
        rejectedCount: list.filter((r) => r.status === 'ARCHIVED').length,
        averageBudget: values.length ? `$${Math.round(values.reduce((a, b) => a + b, 0) / values.length).toLocaleString('en-US')}` : 'Not stated',
        averageAiScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        dealsInCrm: inCrm.length,
        dealsWon: won,
        successRatePercent: list.length ? Math.round((won / list.length) * 100) : 0,
      };
    }).sort((a, b) => b.projectsImported - a.projectsImported);
  } catch (err: unknown) {
    logger.error('Failed to query provider analytics', err);
    return [];
  }
}

const day = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 16);

/** The signed-in person's last 50 collection runs. */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  try {
    const user = await AuthService.verifySession();
    const rows = await db.marketplaceSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map((r) => ({
      id: r.id, providerId: r.providerId, keywords: r.keywords, country: r.country, budget: r.budget, technology: r.technology,
      resultsCount: r.resultsCount, timestamp: day(r.createdAt), executionTimeMs: r.executionTimeMs,
    }));
  } catch (err: unknown) {
    logger.error('Failed to query search history', err);
    return [];
  }
}

export async function addSearchHistory(entry: Omit<SearchHistoryItem, 'id' | 'timestamp'>) {
  try {
    const user = await AuthService.verifySession();
    const row = await db.marketplaceSearch.create({
      data: {
        userId: user.id, providerId: entry.providerId.slice(0, 50), keywords: entry.keywords.slice(0, 200), technology: entry.technology.slice(0, 200),
        country: entry.country.slice(0, 100), budget: entry.budget.slice(0, 100), resultsCount: entry.resultsCount, executionTimeMs: Math.round(entry.executionTimeMs),
      },
    });
    return { success: true, item: { ...entry, id: row.id, timestamp: day(row.createdAt) } };
  } catch (err: unknown) {
    logger.error('Failed to log search history', err);
    throw new AppError('Failed to record search history.', 500);
  }
}

export async function deleteSearchHistory(id: string) {
  try {
    const user = await AuthService.verifySession();
    await db.marketplaceSearch.deleteMany({ where: { id, userId: user.id } });
    return { success: true, id };
  } catch (err: unknown) {
    logger.error(`Failed to delete search history ${id}`, err);
    throw new AppError('Failed to delete search history.', 500);
  }
}

/** The signed-in person's presets plus the ones teammates shared. */
export async function getSavedSearches(): Promise<SavedSearchItem[]> {
  try {
    const user = await AuthService.verifySession();
    const rows = await db.marketplaceSavedSearch.findMany({ where: { OR: [{ userId: user.id }, { isShared: true }] }, orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map((r) => ({
      id: r.id, name: r.name, providerId: r.providerId, keywords: r.keywords, country: r.country, budget: r.budget, technology: r.technology,
      category: r.category, isShared: r.isShared, createdDate: r.createdAt.toISOString().slice(0, 10),
    }));
  } catch (err: unknown) {
    logger.error('Failed to query saved searches', err);
    return [];
  }
}

export async function createSavedSearch(item: Omit<SavedSearchItem, 'id' | 'createdDate'>) {
  try {
    const user = await AuthService.verifySession();
    const name = item.name.trim().slice(0, 100);
    if (!name) throw new AppError('Give the preset a name.', 400);
    const row = await db.marketplaceSavedSearch.create({
      data: {
        userId: user.id, name, providerId: item.providerId, keywords: item.keywords.slice(0, 200), technology: item.technology.slice(0, 200),
        country: item.country.slice(0, 100), budget: item.budget.slice(0, 100), category: item.category.slice(0, 100), isShared: item.isShared,
      },
    });
    safeRevalidatePath('/marketplace');
    return { success: true, item: { ...item, name, id: row.id, createdDate: row.createdAt.toISOString().slice(0, 10) } };
  } catch (err: unknown) {
    logger.error('Failed to save search preset', err);
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to create saved search.', 500);
  }
}

/** Deletes a preset. Only the person who made it can delete it, even when it is shared. */
export async function deleteSavedSearch(id: string) {
  try {
    const user = await AuthService.verifySession();
    const res = await db.marketplaceSavedSearch.deleteMany({ where: { id, userId: user.id } });
    if (!res.count) throw new AppError('Only the person who saved this preset can delete it.', 403);
    safeRevalidatePath('/marketplace');
    return { success: true, id };
  } catch (err: unknown) {
    logger.error(`Failed to delete saved search ${id}`, err);
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to delete saved search.', 500);
  }
}
